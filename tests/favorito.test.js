// O Favorito abre a janela do Receituário nas telas que aceita. Ele roda na página do iSaúde: aqui, só os globais que
// ele toca, com a rede fora do ar (o cadastro vai vazio) e o prazo de 30 s desligado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { favorito } from '../favorito.js';

async function rodar(pathname, nomeNoIsaude = 'Fulano de Tal') {
  const alertas = [];
  let abriu = false;
  const globais = {
    location: { origin: 'https://brumadinho-mg.nobesistemas.com.br', pathname },
    alert: (m) => alertas.push(m),
    window: {
      appContext: { user: { name: 'Fulano de Tal' } },
      open: () => { abriu = true; return { postMessage() {} }; },
      addEventListener() {},
      removeEventListener() {},
    },
    document: {
      getElementById: (id) => (id === 'modal_edit_user_setting' ? { textContent: 'UBS CENTRO - CLINICA' } : null),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    fetch: async () => { throw new Error('sem rede'); },
    setTimeout: () => 0,
    clearTimeout() {},
  };
  const antes = Object.fromEntries(Object.keys(globais).map((k) => [k, globalThis[k]]));
  Object.assign(globalThis, globais);
  try {
    await favorito({ endereco: 'http://localhost:8123/index.html', nomeNoIsaude, prescritor: {}, unidades: [{ nomeNoIsaude: 'UBS Centro', unidade: {} }] });
  } finally {
    Object.assign(globalThis, antes);
  }
  return { alertas, abriu };
}

// Editar só abre para quem emitiu a renovação, no mesmo dia: as outras, o iSaúde só deixa Consultar.
for (const tela of [
  '/saude/receptions/1/soap_attendances/2/edit',
  '/saude/receptions/1/clinical_attendances/2/edit',
  '/saude/prescription_renewals/546/edit',
  '/saude/prescription_renewals/546',
]) {
  test(`abre em ${tela}`, async () => {
    assert.deepEqual(await rodar(tela), { alertas: [], abriu: true });
  });
}

test('recusa a lista das renovações', async () => {
  const { alertas, abriu } = await rodar('/saude/prescription_renewals');
  assert.equal(abriu, false);
  assert.match(alertas[0], /^Abra o favorito na tela/);
});

// O Prescritor pode copiar o nome como o topo mostra: "{número} - {NOME} - {especialidade}".
test('aceita o nome do Prescritor copiado do topo', async () => {
  assert.deepEqual(await rodar('/saude/prescription_renewals/546', '5476 - FULANO DE TAL - CLINICA MÉDICA'), { alertas: [], abriu: true });
});

test('recusa outro profissional', async () => {
  for (const nome of ['Beltrano', '5476 - BELTRANO - CLINICA MÉDICA', 'Fulano']) {
    assert.deepEqual(await rodar('/saude/prescription_renewals/546', nome), { alertas: ['Este favorito é de outro profissional.'], abriu: false });
  }
});
