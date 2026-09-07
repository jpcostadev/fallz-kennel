# Regras do projeto Fallz Kennel

## Releases

- Ao gerar uma nova versão, remover da pasta `release/` todos os instaladores, executáveis portáteis, blockmaps e diretórios empacotados pertencentes às versões anteriores.
- A pasta `release/` deve conter somente os artefatos da versão atual e os arquivos auxiliares necessários para essa versão.
- Antes de apagar, conferir os caminhos e as versões para nunca remover o release recém-gerado.
- Depois da limpeza, listar o conteúdo de `release/` e confirmar que não restaram artefatos antigos.
- Nunca entregar um novo release ao usuário antes de concluir essa limpeza.

## Qualidade

- Antes de entregar um release, executar typecheck, lint, testes e build.
- Não afirmar que um módulo está funcional quando ele possuir apenas interface visual.
- Nenhuma funcionalidade de cadastro pode ser considerada pronta apenas porque cria ou salva um registro. Implementar e validar o fluxo completo: criar, persistir, sincronizar, listar, visualizar nos locais relacionados, editar e excluir quando aplicável.
- Todo dado vinculado a uma entidade deve aparecer na ficha e nas telas de consulta dessa entidade. Exemplo obrigatório: planos de alimentação salvos devem aparecer na lista de planos e na ficha do cão correspondente.
- Antes de gerar uma build, testar o fluxo completo com dados reais de exemplo e confirmar que o registro continua acessível depois de fechar, reabrir e sincronizar o aplicativo.
- Registrar implementações incompletas explicitamente; nunca ocultar, presumir ou apresentar uma etapa parcial como funcionalidade concluída.
