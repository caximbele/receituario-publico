// A mensagem que o Favorito manda da tela do iSaúde, e a conversão do que ele leu no paciente da Montagem (spec da
// Fase 3, seções 1.6 e 3). O Favorito manda os textos como lidos: a regra fica aqui, testada no Node, e corrigi-la não
// obriga a recriar o Favorito.
import { dataExiste } from './datas.js';

// A origem inteira: só o fim ".nobesistemas.com.br" valeria para o iSaúde de qualquer município.
export const ORIGEM_DO_ISAUDE = 'https://brumadinho-mg.nobesistemas.com.br';

// Só a mensagem da janela que abriu a página e da origem do iSaúde. Sem `opener`, nenhuma.
export const doIsaude = (evento, opener) => Boolean(opener) && evento.source === opener && evento.origin === ORIGEM_DO_ISAUDE;

// As chaves de texto de cada parte da mensagem (plano da Fase 3, "A mensagem"). O `cabecalho` da unidade é uma lista e
// é conferido à parte.
const CHAVES = {
  lido: ['nome', 'nascimento', 'sexo', 'cns', 'cpf'],
  cadastro: ['municipio', 'logradouro', 'numero', 'complemento', 'bairro', 'telefone', 'celular', 'outrosTelefones'],
  prescritor: ['nome', 'conselho', 'numero', 'uf', 'cargo'],
  unidade: ['nome', 'cnes', 'endereco', 'telefone', 'municipio', 'uf'],
};
const TELAS = ['soap', 'renovacao', 'upa'];
// O sexo que o iSaúde guarda em código, no select da UPA e talvez no da SOAP.
const SEXO = { female: 'Feminino', male: 'Masculino' };

const FORMATO = 'Os dados do favorito vieram num formato que a página não conhece. Recrie o favorito na página Criar o favorito.';
const VERSAO = 'Este favorito é de outra versão. Recrie o favorito na página Criar o favorito.';

const soTextos = (parte, chaves) => typeof parte === 'object' && parte !== null && chaves.every((k) => typeof parte[k] === 'string');
// Só as chaves conhecidas: o que mais vier na mensagem não chega à Montagem.
const soAs = (parte, chaves) => Object.fromEntries(chaves.map((k) => [k, parte[k]]));

// O paciente no formato da entrada da `montarReceita`, com '' no que falta. O Favorito nunca inventa, e esta conversão
// também não: o que não está no formato esperado fica vazio (a data) ou como lido (o CNS).
export function pacienteDoLido(lido) {
  const [nome, nascimento, sexo, cns, cpf] = CHAVES.lido.map((k) => lido[k].trim());
  const c = Object.fromEntries(CHAVES.cadastro.map((k) => [k, lido.cadastro[k].trim()]));
  // Nas telas SOAP e da UPA, o cabeçalho é "{prontuário} - {NOME}", e o nome pode ter outro " - ".
  const depois = nome.indexOf(' - ');
  const [, dia, mes, ano] = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(nascimento) ?? [];
  const data = ano ? `${ano}-${mes}-${dia}` : '';
  const digitos = cns.replace(/\s/g, '');
  return {
    nome: lido.tela !== 'renovacao' && depois >= 0 ? nome.slice(depois + 3).trim() : nome,
    nascimento: data && dataExiste(data) ? data : '',
    sexo: SEXO[sexo] ?? sexo,
    cns: /^\d{15}$/.test(digitos) ? digitos.replace(/^(\d{3})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4') : cns,
    cpf,
    // Sem o logradouro, não há endereço: só o município ou o bairro não bastam, e o alerta do endereço aparece
    // (decisão do usuário de 19/11/2026, etapa 22).
    endereco: c.logradouro ? [c.logradouro, c.numero, c.complemento, c.bairro, c.municipio].filter(Boolean).join(', ') : '',
    contato: c.celular || c.telefone || c.outrosTelefones.split(/[,;/]/)[0].trim(),
  };
}

// `{ erro }`, ou o paciente convertido, o Prescritor e a unidade só com as chaves conhecidas e a hora da leitura.
export function lerMensagem(dados) {
  if (typeof dados !== 'object' || dados === null || dados.tipo !== 'atendimento') return { erro: FORMATO };
  // O Favorito fica no Chrome e não muda quando a página é publicada de novo.
  if (dados.versao !== 1) return { erro: VERSAO };
  const { lido, prescritor, unidade, lidoEm } = dados;
  const conhecido = typeof lidoEm === 'string' && soTextos(lido, CHAVES.lido) && TELAS.includes(lido.tela)
    && soTextos(lido.cadastro, CHAVES.cadastro) && soTextos(prescritor, CHAVES.prescritor) && soTextos(unidade, CHAVES.unidade)
    && Array.isArray(unidade.cabecalho) && unidade.cabecalho.every((linha) => typeof linha === 'string');
  if (!conhecido) return { erro: FORMATO };
  return {
    paciente: pacienteDoLido(lido),
    prescritor: soAs(prescritor, CHAVES.prescritor),
    unidade: { ...soAs(unidade, CHAVES.unidade), cabecalho: [...unidade.cabecalho] },
    lidoEm,
  };
}
