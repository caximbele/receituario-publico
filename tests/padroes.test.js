// Cada Padrão (ADR 0011) passa pela Montagem sem erro, sai num Receituário que a página emite e volta igual pela
// Renovação. Rodar com: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import padroes from '../dados/padroes.js';
import catalogo from '../dados/catalogo.js';
import demonstracao from '../dados/demonstracao.js';
import { montarReceita, notificacao } from '../src/montagem.js';
import { textoParaColar } from '../src/texto-para-colar.js';
import { renovar } from '../src/renovacao.js';

const entrada = (itens) => ({
  paciente: demonstracao.pacientes[0],
  prescritor: demonstracao.prescritor,
  unidade: demonstracao.unidade,
  demonstracao: true,
  emissao: '2026-11-26',
  catalogo,
  configuracao: {},
  itens,
});

test('os nomes dos Padrões são únicos', () => {
  const nomes = padroes.map((p) => p.nome);
  assert.deepEqual(nomes.filter((n, i) => nomes.indexOf(n) !== i), []);
});

for (const { nome, grupo, item } of padroes) {
  test(nome, () => {
    assert.ok(grupo, 'sem Grupo');
    const produto = catalogo.find((p) => p.codigo === item.produto);
    assert.ok(produto, `Produto ${item.produto} fora do catálogo`);
    assert.equal(notificacao(produto), null, 'exige Notificação de Receita');
    assert.ok(!item.usoContinuo && !item.inicio, 'Padrão com Uso contínuo ou Início');

    const montada = montarReceita(entrada([item]));
    assert.deepEqual(montada.itens[0].erros, []);
    assert.equal(montada.receitas.length, 1);
    assert.deepEqual(montada.bloqueios, []);

    const renovado = renovar(textoParaColar(montada), entrada([])).itens[0];
    assert.equal(montarReceita(entrada([renovado])).itens[0].frase, montada.itens[0].frase);
  });
}
