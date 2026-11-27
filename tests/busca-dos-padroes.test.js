// As buscas da tela: cada palavra da consulta é o começo de uma palavra do nome, sem acento nem maiúsculas, com o número
// separado da unidade ("500mg" é "500 mg"); na do quadro Padrões, os achados vêm na ordem da lista, e a consulta sem
// palavra não acha nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarPadroes, buscarProdutos } from '../src/busca.js';
import catalogo from '../dados/catalogo.js';

const padroes = [
  'Dipirona 500 mg — dor',
  'Dipirona 500 mg — febre',
  'Ácido mefenâmico 500 mg',
  'Escopolamina + dipirona 10+250 mg',
  'Aciclovir 200 mg — herpes-zóster',
].map((nome) => ({ nome }));

test('acha pelo começo das palavras, na ordem da lista', () => {
  assert.deepEqual(buscarPadroes(padroes, 'dipi'), [0, 1, 3]);
  assert.deepEqual(buscarPadroes(padroes, 'dipi feb'), [1]);
  assert.deepEqual(buscarPadroes(padroes, 'pirona'), []);
});

test('sem acento e sem maiúsculas', () => {
  assert.deepEqual(buscarPadroes(padroes, 'ACIDO'), [2]);
  assert.deepEqual(buscarPadroes(padroes, 'zoster'), [4]);
});

// Só um sinal casaria com todos, e o Enter escolheria o 1º Padrão sem nada ter sido buscado.
test('sem palavra, não acha nada', () => {
  for (const consulta of ['', '  ', '+', '—', '´']) assert.deepEqual(buscarPadroes(padroes, consulta), [], consulta);
});

test('o número junto da unidade', () => {
  assert.deepEqual(buscarPadroes(padroes, 'dipirona 500mg febre'), [1]);
  const comEspaco = buscarProdutos(catalogo, 'amoxicilina 500 mg');
  assert.ok(comEspaco.length > 0);
  assert.deepEqual(buscarProdutos(catalogo, 'amoxicilina 500mg'), comEspaco);
});
