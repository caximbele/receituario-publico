// O Texto para colar: o que foi impresso, só com as Frases, sob o título de cada Receita. É a memória da Receita na
// evolução do iSaúde, e a Renovação o lê de volta (ADR 0008). Com um bloqueio não há impresso, e por isso não há texto.
export function textoParaColar({ receitas, bloqueios }) {
  if (bloqueios.length || !receitas.length) return null;
  return [
    ...(receitas[0].marca ? [receitas[0].marca] : []),
    `Receita emitida em ${receitas[0].emissao} pelo Receituário.`,
    ...receitas.flatMap(({ tipo, itens }) => [
      tipo,
      ...itens.flatMap(({ numero, frase, justificativa }) => [
        `${numero}. ${frase}`,
        ...(justificativa ? [`Justificativa: ${justificativa}`] : []),
      ]),
    ]),
  ].join('\n');
}
