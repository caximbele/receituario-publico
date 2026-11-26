// A mensagem do Favorito: a tela da UPA é aceita, e o sexo em código vira o texto (docs/pesquisa/tela-da-upa.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerMensagem } from '../src/mensagem.js';

const vazios = (chaves) => Object.fromEntries(chaves.map((k) => [k, '']));
const mensagem = ({ tela, nome = '', sexo = '' }) => ({
  tipo: 'atendimento',
  versao: 1,
  lidoEm: '2026-11-26T12:00:00.000Z',
  lido: {
    tela,
    ...vazios(['nascimento', 'cns', 'cpf']),
    nome,
    sexo,
    cadastro: vazios(['municipio', 'logradouro', 'numero', 'complemento', 'bairro', 'telefone', 'celular', 'outrosTelefones']),
  },
  prescritor: vazios(['nome', 'conselho', 'numero', 'uf', 'cargo']),
  unidade: { ...vazios(['nome', 'cnes', 'endereco', 'telefone', 'municipio', 'uf']), cabecalho: [] },
});

test('mensagem da UPA é aceita e o prontuário sai do nome', () => {
  const r = lerMensagem(mensagem({ tela: 'upa', nome: '261622 - TESTE DA SILVA TESTE' }));
  assert.equal(r.erro, undefined);
  assert.equal(r.paciente.nome, 'TESTE DA SILVA TESTE');
});
test('sexo em código vira o texto', () => {
  assert.equal(lerMensagem(mensagem({ tela: 'soap', sexo: 'female' })).paciente.sexo, 'Feminino');
  assert.equal(lerMensagem(mensagem({ tela: 'upa', sexo: 'male' })).paciente.sexo, 'Masculino');
  assert.equal(lerMensagem(mensagem({ tela: 'renovacao', sexo: 'Feminino' })).paciente.sexo, 'Feminino');
});
test('tela desconhecida é recusada', () => {
  assert.match(lerMensagem(mensagem({ tela: 'outra' })).erro, /formato que a página não conhece/);
});
test('na Renovação o nome fica inteiro', () => {
  assert.equal(lerMensagem(mensagem({ tela: 'renovacao', nome: 'A - B' })).paciente.nome, 'A - B');
});
