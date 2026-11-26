# Este repositório passa a ser a fonte

Os ADRs 0001 a 0008, a spec, os testes e o `construir-catalogo.js` ficaram no repositório "prescritor", que não está
disponível; este repositório era só a saída publicada, e em 26/11/2026 já tinha commits feitos direto nele. Decidimos
torná-lo a fonte: os testes do motor (`node --test`) voltam à medida que o código é mexido, e a numeração dos ADRs
continua de 0009 para não colidir com os que o código cita.

## Consequences

- `dados/catalogo.js` continua sem edição à mão, como diz o cabeçalho, mas agora é dado fixo: sem o gerador, nenhum
  catálogo novo entra. Os Padrões apontam para o `codigo` do Produto.
- Se o "prescritor" aparecer, os commits daqui e o trabalho da UPA migram para lá.
