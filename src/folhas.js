// A repartição da Via em folhas, regra do molde de impressão que não vem da Montagem, porque depende da altura medida
// no papel (ADR 0006).
//
// Recebe quantos itens a Via tem e cabe(de, ate, ultima), que diz se os itens de "de" até antes de "ate" cabem numa
// folha: com o início (cabeçalho, Emitente e Paciente) quando "de" é 0, e com o fim (assinatura, campos em branco e
// marca) quando "ultima" é true. Devolve os itens de cada folha, como [de, ate].
export function repartirEmFolhas(total, cabe) {
  const folhas = [];
  for (let de = 0; ;) {
    // Sem item, o fim fica nesta folha mesmo que não caiba: assim a repartição sempre termina. Só chega aqui sem item
    // quando nem o último item sozinho cabe com o fim.
    if (de === total || cabe(de, total, true)) {
      folhas.push([de, total]);
      return folhas;
    }
    let ate = de + 1; // ao menos um item por folha: o maior que a folha sai sozinho, sem ser partido
    while (ate < total && cabe(de, ate + 1, false)) ate += 1;
    if (ate === total && ate - de > 1) ate -= 1; // para a assinatura não sair numa folha sem item, o último vai com ela
    folhas.push([de, ate]);
    de = ate;
  }
}
