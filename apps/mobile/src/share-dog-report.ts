import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  dogPhotoService,
  dogService,
  feedingService,
  moduleService,
  type MobileDog,
} from "./database";

const safe = (value: unknown) =>
  String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function shareDogReport(dog: MobileDog): Promise<void> {
  const [weights, feeding, allHealth, allBreeding, photo] = await Promise.all([
    dogService.weights(dog.id),
    feedingService.find(dog.id),
    moduleService.list("health"),
    moduleService.list("breeding"),
    dogPhotoService.get(dog.id),
  ]);
  const health = allHealth.filter((item) => item.dogId === dog.id);
  const breeding = allBreeding.filter((item) => item.dogId === dog.id);
  const rows = weights.map((item) => `<tr><td>${safe(new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR"))}</td><td>${safe((item.weightGrams / 1000).toLocaleString("pt-BR"))} kg</td><td>${safe(item.bodyConditionScore ?? "—")}/9</td></tr>`).join("");
  const healthRows = health.map((item) => `<tr><td>${safe(new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR"))}</td><td>${safe(item.category)}</td><td>${safe(item.title)}</td><td>${safe(item.description)}</td></tr>`).join("");
  const breedingRows = breeding.map((item) => `<tr><td>${safe(new Date(`${item.date}T12:00`).toLocaleDateString("pt-BR"))}</td><td>${safe(item.category)}</td><td>${safe(item.title)}</td><td>${safe(item.description)}</td></tr>`).join("");
  const photoData = photo ? `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(photo, { encoding: FileSystem.EncodingType.Base64 })}` : null;
  const file = await Print.printToFileAsync({
    html: `<html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#142033;padding:26px}h1{color:#087ff5;margin-bottom:3px}h2{margin-top:26px;border-bottom:2px solid #087ff5;padding-bottom:5px}table{width:100%;border-collapse:collapse}th{background:#e9f3ff;text-align:left}th,td{padding:8px;border:1px solid #ccd6e2}.photo{width:130px;height:130px;border-radius:24px;object-fit:cover;float:right}</style></head><body>${photoData ? `<img class="photo" src="${photoData}"/>` : ""}<h1>Ficha de ${safe(dog.name)}</h1><p><b>Registro:</b> ${safe(dog.registeredName)}<br/><b>Nascimento:</b> ${safe(new Date(`${dog.birthDate}T12:00`).toLocaleDateString("pt-BR"))}<br/><b>Raça:</b> ${safe(dog.breed)}<br/><b>Sexo:</b> ${dog.sex === "female" ? "Fêmea" : "Macho"}<br/><b>Cor:</b> ${safe(dog.color)}</p><h2>Alimentação</h2>${feeding ? `<p><b>Ração:</b> ${safe(feeding.foodName)}<br/><b>Porção:</b> ${safe(feeding.gramsPerMeal)} g, ${safe(feeding.mealsPerDay)}× ao dia (${safe(feeding.dailyGrams)} g/dia)<br/><b>Horários:</b> ${safe(feeding.times.join(" · "))}</p>` : "<p>Sem plano cadastrado.</p>"}<h2>Pesagens</h2><table><tr><th>Data</th><th>Peso</th><th>BCS</th></tr>${rows}</table><h2>Saúde e vacinação</h2><table><tr><th>Data/dose</th><th>Tipo</th><th>Vacina/registro</th><th>Marca, lote e observações</th></tr>${healthRows}</table><h2>Reprodução</h2><table><tr><th>Data</th><th>Etapa</th><th>Registro</th><th>Observações</th></tr>${breedingRows}</table><p>${safe(dog.notes)}</p></body></html>`,
  });
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    dialogTitle: `Ficha de ${dog.name}`,
  });
}
