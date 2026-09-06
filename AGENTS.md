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
