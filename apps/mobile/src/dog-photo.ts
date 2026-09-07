import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export async function selectOptimizedDogPhoto(dogId: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error("Permita o acesso às fotos para escolher a imagem do cão.");
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (picked.canceled) return null;
  const optimized = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 800, height: 800 } }],
    { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG },
  );
  const directory = `${FileSystem.documentDirectory}dog-photos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${dogId}.jpg`;
  await FileSystem.copyAsync({ from: optimized.uri, to: destination });
  return destination;
}
