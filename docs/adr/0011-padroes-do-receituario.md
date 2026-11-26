# Padrões próprios do Receituário, e não as Receitas Padrões do iSaúde

O iSaúde já tem Receitas Padrões, que acrescentam itens à grade do Receituário dele. Decidimos ter Padrões próprios
mesmo assim: elas só poupam a digitação, e o impresso continua o do iSaúde, sem o Tipo de receituário de antimicrobiano,
com controlados junto dos comuns e com as Vias inconsistentes da auditoria de 13/11/2026. O Padrão é só um Item pronto,
que passa pela mesma Montagem e pelo mesmo impresso.

## Consequences

- O Padrão preenche o formulário do Novo item, e o Prescritor confirma com Enter: a Dose e a duração passam pelos olhos
  antes de entrar na Receita.
- A lista é uma só, publicada em `dados/padroes.js`, curada pelo Prescritor e conferida pela Montagem antes de entrar.
- O Padrão pode trazer Recomendações fixas, como "em cada narina", "em jejum" ou "completar todo o tratamento", que
  entram no formulário com o resto e o Prescritor pode mudar (decisão de 26/11/2026, que revê a de deixá-las sempre em
  branco: sem elas, o Prescritor teria de digitá-las em toda Receita). Nunca traz Início do tratamento, e nunca é de
  Uso contínuo.
- Padrão que exige Notificação de Receita não entra: um teste falha. Controle Especial entra, com o CPF lido do iSaúde.
- O quadro Padrões aparece em toda Tela de atendimento e na demonstração; some abaixo de 12 anos na data de emissão e,
  sem data de nascimento, aparece com um alerta. A pediatria, por peso ou idade, fica para a versão 2.
