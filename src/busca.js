// As buscas que a tela usa, a de Produtos e a de Padrões: o que casa com a consulta e como cada Produto é mostrado.
import { semAcento, nomeDoProduto } from './produto.js';

// As duas linhas de um resultado da busca: "Amoxicilina 50 mg/ml — pó para suspensão" e, em cinza, "frasco de 60 ml ·
// disponível na rede". Fora da REMUME, a linha 2 não fala da rede.
export function descreverProduto(p) {
  const { tipo, conteudo, unidade } = p.fornecimento;
  const fornecimento = conteudo === null ? tipo : `${tipo} de ${conteudo.toLocaleString('pt-BR')} ${unidade}`;
  return {
    rotulo: nomeDoProduto(p),
    descricao: [fornecimento, p.disponivelNaRede && 'disponível na rede'].filter(Boolean).join(' · '),
  };
}

const ordem = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

// A consulta e o nome são cortados nas mesmas fronteiras, para "50 mg/ml" casar com "50 mg/ml" e "1,5" com "1,5 mg". A
// passagem de número para letra também corta, para "500mg" casar com "500 mg"; a de letra para número, não, para "d3" e
// "b12" continuarem uma palavra só (cortados, "d3" acharia 153 Produtos, e não 4).
const palavrasDe = (texto) => semAcento(texto).replace(/(?<=\p{N})(?=\p{L})/gu, ' ').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Cada palavra da consulta é o começo de uma palavra do nome.
const casa = (termos, nome) => {
  const palavras = palavrasDe(nome);
  return termos.every((termo) => palavras.some((palavra) => palavra.startsWith(termo)));
};

// Busca pelo nome do Produto inteiro (revisão 2.4): cada palavra da consulta é o começo de uma palavra do nome, e por
// isso "losartana 50" e "amox 500 caps" acham. Os disponíveis na rede vêm primeiro; depois, nome, concentração, forma
// e conteúdo da Unidade de fornecimento.
export function buscarProdutos(produtos, consulta) {
  const termos = palavrasDe(consulta);
  return produtos
    .filter((p) => casa(termos, nomeDoProduto(p)))
    .sort((a, b) => (b.disponivelNaRede - a.disponivelNaRede)
      || ordem.compare(a.principioAtivo, b.principioAtivo)
      || ordem.compare(a.concentracao, b.concentracao)
      || ordem.compare(a.forma, b.forma)
      || (a.fornecimento.conteudo ?? 0) - (b.fornecimento.conteudo ?? 0));
}

// A busca do quadro Padrões, pelo nome do Padrão, do mesmo jeito: "dipi feb" acha "Dipirona 500 mg — febre". Devolve as
// posições dos achados em `padroes`, na ordem da lista.
// Sem palavra, como só um sinal ou o acento antes da vogal, não acha nada: uma consulta sem termos casaria com todos.
export function buscarPadroes(padroes, consulta) {
  const termos = palavrasDe(consulta);
  if (!termos.length) return [];
  return padroes.flatMap(({ nome }, i) => (casa(termos, nome) ? [i] : []));
}
