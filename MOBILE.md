# Fallz Kennel Mobile

Aplicativo Expo/React Native offline-first em `apps/mobile`.

## Executar

```bash
pnpm mobile:start
```

Para testar notificações e SQLite nativos, use um aparelho Android ou development build. O bundle Android pode ser validado com:

```bash
pnpm --filter @fallz/mobile exec expo export --platform android --output-dir dist
```

## Alimentação

- RER: `70 × pesoKg^0,75`.
- A necessidade diária inicial aplica o fator de fase de vida.
- Gramas/dia: `kcalDiárias ÷ (kcalKgDaRação / 1000)`.
- A energia deve ser copiada da embalagem da ração; não é inferida pela marca.
- O resultado é uma estimativa inicial. Peso, BCS, fezes, atividade e orientação veterinária determinam os ajustes.
- Filhotes, gestantes, lactantes e animais doentes exigem acompanhamento veterinário/nutricional.

## Estado implementado

- SQLite persistente com WAL, chaves estrangeiras e índices;
- cadastro de cães e peso inicial;
- cálculo testado de RER, kcal/dia, gramas/dia e gramas/refeição;
- plano de horários de alimentação;
- notificações diárias locais de alimentação;
- agenda e notificações locais de consultas;
- navegação inferior Android/iOS.

## Próximas integrações

- autenticação e sincronização Firestore no mobile;
- importação inicial dos cães cadastrados no Desktop;
- histórico completo de peso/BCS e ajuste assistido da porção;
- build Android assinada (APK/AAB) via EAS ou Android SDK local.
