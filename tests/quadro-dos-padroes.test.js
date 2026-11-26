// O quadro Padrões só a partir de 12 anos completos na data de emissão; sem data de nascimento, com o alerta (ADR 0011).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quadroDosPadroes, ALERTA_SEM_NASCIMENTO } from '../src/padroes.js';
import { idade } from '../src/datas.js';

test('adulto vê o quadro, sem alerta', () => {
  assert.deepEqual(quadroDosPadroes('1960-05-10', '2026-11-26'), { mostrar: true, alerta: null });
});
test('12 anos no dia do aniversário', () => {
  assert.deepEqual(quadroDosPadroes('2014-11-26', '2026-11-26'), { mostrar: true, alerta: null });
});
test('11 anos na véspera do aniversário', () => {
  assert.deepEqual(quadroDosPadroes('2014-11-27', '2026-11-26'), { mostrar: false, alerta: null });
});
test('sem nascimento: aparece com alerta', () => {
  assert.deepEqual(quadroDosPadroes('', '2026-11-26'), { mostrar: true, alerta: ALERTA_SEM_NASCIMENTO });
});
test('nascimento inválido ou futuro: aparece com alerta', () => {
  for (const n of ['2026-02-30', '2027-01-01', 'abc', undefined]) {
    assert.deepEqual(quadroDosPadroes(n, '2026-11-26'), { mostrar: true, alerta: ALERTA_SEM_NASCIMENTO });
  }
});
test('idade() não mudou', () => {
  assert.equal(idade('1960-05-10', '2026-11-26'), '66 anos');
  assert.equal(idade('2026-03-01', '2026-11-26'), '8 meses');
  assert.equal(idade('2026-11-09', '2026-11-26'), '17 dias');
  assert.equal(idade('', '2026-11-26'), '');
});
