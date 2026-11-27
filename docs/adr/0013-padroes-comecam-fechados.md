# O quadro Padrões começa fechado

No atendimento da USF, os 71 Padrões abertos empurram o Novo item para baixo da tela. Decidimos, a pedido do Prescritor
em 27/11/2026, que a lista dos Padrões começa sempre fechada, em toda Tela de atendimento e na demonstração, e que o
Prescritor a abre com um clique no título. A página não lembra a escolha, porque não usa armazenamento do navegador:
cada abertura pelo Favorito começa com a lista fechada.

## Consequences

- Revê o ADR 0011 só nisto: a lista dos Padrões começa fechada. De resto, o quadro continua em toda Tela de atendimento
  e na demonstração, e continua sumindo abaixo de 12 anos.
- O título é um botão dentro do `<h2>` (o padrão de mostrar e esconder do WAI-ARIA), e não um `<details>`: com o `<h2>`
  dentro do `<summary>`, o JAWS deixa de achar o título na navegação por cabeçalhos.
- O alerta sem data de nascimento fica entre o título e a lista, visível com ela fechada ou aberta.
