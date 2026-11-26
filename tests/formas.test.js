// As formas que entraram no motor para os Padrões da UPA: loção, xampu, solução tópica, solução e o envelope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalogo from '../dados/catalogo.js';
import demonstracao from '../dados/demonstracao.js';
import { montarReceita, unidadesDeDose } from '../src/montagem.js';
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

const CASOS = [
  { codigo: 'BR0363597-1', nome: 'Permetrina 5% loção', unidades: ['aplicação'], via: 6 },
  { codigo: 'BR0271103-1', nome: 'Cetoconazol 2% xampu', unidades: ['aplicação'], via: 5 },
  { codigo: 'BR0271140', nome: 'Rifamicina solução tópica', unidades: ['aplicação'], via: 6 },
  { codigo: 'BR0371273-3', nome: 'Cloreto de sódio 0,9% solução', unidades: ['ml'], via: 19 },
  { codigo: 'BR0378055', nome: 'Fosfomicina granulado em envelope', unidades: ['envelope'], via: 0 },
  { codigo: 'BR0274806', nome: 'Acetilcisteína granulado em envelope', unidades: ['envelope'], via: 0 },
  { codigo: 'BR0268390', nome: 'Sais para reidratação oral em envelope', unidades: ['envelope'], via: 0 },
];

for (const { codigo, nome, unidades, via } of CASOS) {
  test(nome, () => {
    const produto = catalogo.find((p) => p.codigo === codigo);
    assert.deepEqual(unidadesDeDose(produto), unidades);
    const item = {
      produto: codigo,
      dose: { valor: '1', unidade: unidades[0] },
      viaAdministracao: via,
      posologia: { tipo: 'dose_unica' },
      quantidadeDispensar: unidades[0] === 'aplicação' ? 1 : undefined,
    };
    const montada = montarReceita(entrada([item]));
    assert.deepEqual(montada.itens[0].erros, []);
    const renovado = renovar(textoParaColar(montada), entrada([])).itens[0];
    assert.equal(montarReceita(entrada([renovado])).itens[0].frase, montada.itens[0].frase);
  });
}

test('envelope sai como envelope', () => {
  const item = { produto: 'BR0378055', dose: { valor: '1', unidade: 'envelope' }, viaAdministracao: 0, posologia: { tipo: 'dose_unica' } };
  assert.match(montarReceita(entrada([item])).itens[0].frase, /Tomar 01 envelope por via oral, dose única\. Quantidade: 01 envelope/);
});

test('o soro em ml se converte em frascos de 250 ml', () => {
  const item = {
    produto: 'BR0371273-3', dose: { valor: '40', unidade: 'ml' }, viaAdministracao: 19,
    posologia: { tipo: 'vezes_ao_dia', vezes: 4 }, duracao: { valor: 7, unidade: 'dia' },
  };
  assert.match(montarReceita(entrada([item])).itens[0].frase, /Quantidade: 05 frascos de 250 ml/);
});
