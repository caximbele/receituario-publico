// O Favorito: roda na tela do iSaúde, confere o profissional e a unidade, lê o paciente sem escrever nada e passa os
// textos como lidos para a janela do Receituário (spec da Fase 3, seção 1; leitura em docs/pesquisa/leitura-do-isaude.md).
// A página "Criar o favorito" o transforma em link pelo `toString()`: a função não pode usar nada de fora dela além dos
// globais do navegador, e o arquivo não tem `import`.

export async function favorito(config) {
  const ISAUDE = 'https://brumadinho-mg.nobesistemas.com.br';
  // Sem acentos, maiúsculas e espaços repetidos.
  const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const lidoEm = new Date().toISOString();

  const soap = /^\/saude\/receptions\/\d+\/soap_attendances\/\d+\/edit$/.test(location.pathname);
  const upa = /^\/saude\/receptions\/\d+\/clinical_attendances\/\d+\/edit$/.test(location.pathname);
  const renovacao = /^\/saude\/prescription_renewals\/(\d+)\/edit$/.exec(location.pathname);
  if (location.origin !== ISAUDE || !(soap || upa || renovacao)) return alert('Abra o favorito na tela de um atendimento ou de uma renovação de receita.');

  // Um nome logado vazio nunca bate.
  const usuario = normalizar(window.appContext?.user?.name);
  if (!usuario || usuario !== normalizar(config.nomeNoIsaude)) return alert('Este favorito é de outro profissional.');
  // A unidade é o Estabelecimento do topo, "{Estabelecimento} - {Setor}" (ADR 0012): o nome inteiro antes do " -", para
  // "UBS CENTRO" não valer em "UBS CENTRO II", e o Setor pode vir vazio. Com dois nomes que servem, vale o mais longo.
  const topo = normalizar(document.getElementById('modal_edit_user_setting')?.textContent);
  const serve = (nome) => nome && (topo === nome || topo.startsWith(`${nome} -`));
  const escolhida = topo && config.unidades
    .filter((u) => serve(normalizar(u.nomeNoIsaude)))
    .sort((a, b) => normalizar(b.nomeNoIsaude).length - normalizar(a.nomeNoIsaude).length)[0];
  if (!escolhida) return alert('Este favorito não tem a unidade em que você está logado.');

  // A janela abre já, no instante do clique, antes dos GETs. O nome fixo reaproveita a mesma janela a cada clique da aba.
  const janela = window.open(config.endereco, 'receituario');
  if (!janela) return alert('O Chrome bloqueou a janela do Receituário. Permita as janelas deste site e clique de novo no favorito.');
  const destino = new URL(config.endereco).origin;
  let mensagem = null, pronto = false, encerrado = false;
  function encerrar() {
    encerrado = true;
    window.removeEventListener('message', ouvir);
    clearTimeout(prazo);
  }
  // Uma vez só, com o "pronto" e a leitura prontos.
  function enviar() {
    if (encerrado || !pronto || !mensagem) return;
    janela.postMessage(mensagem, destino);
    encerrar();
  }
  function ouvir(evento) {
    if (evento.source !== janela || evento.origin !== destino || evento.data?.tipo !== 'pronto') return;
    pronto = true;
    enviar();
  }
  const prazo = setTimeout(() => {
    encerrar();
    alert('O Receituário não respondeu, e nenhum dado passou. Clique de novo no favorito.');
  }, 30000);
  window.addEventListener('message', ouvir);

  // O paciente na tela. O que não acha vai como ''.
  const valor = (id) => document.getElementById(id)?.value ?? '';
  let lido, id;
  if (soap) {
    lido = {
      nome: document.querySelector('#patient-header h3')?.textContent ?? '',
      nascimento: valor('soap_attendance_patient_birthdate'),
      sexo: valor('soap_attendance_patient_gender'),
      cns: valor('soap_attendance_patient_sus_nacional_card'),
      cpf: valor('soap_attendance_patient_cpf'),
    };
    id = valor('soap_attendance_patient_id');
  } else if (upa) {
    // A data de nascimento e o CPF não estão na tela da UPA: vêm do cadastro, mais abaixo.
    lido = {
      nome: document.querySelector('#patient-header h3')?.textContent ?? '',
      nascimento: '',
      sexo: valor('clinical_attendance_patient_gender'),
      cns: valor('clinical_attendance_patient_sus_nacional_card'),
      cpf: '',
    };
    id = valor('clinical_attendance_patient_id');
  } else {
    // "Nome" e "CPF" também são rótulos de outros campos da página: só os do paciente contam.
    const campos = {};
    for (const rotulo of document.querySelectorAll('label[for^="prescription_renewal_patient_field_"]')) campos[normalizar(rotulo.textContent)] = valor(rotulo.htmlFor);
    lido = {
      nome: campos['nome'] ?? '',
      nascimento: campos['data de nascimento'] ?? '',
      sexo: campos['sexo'] ?? '',
      cns: campos['cartao nacional do sus'] ?? '',
      cpf: campos['cpf'] ?? '',
    };
  }

  // O endereço e o contato, no cadastro do paciente. Na tela de Renovação de Receita, o id está na página da renovação.
  // Qualquer falha dá o cadastro vazio, e a página mostra o alerta do endereço.
  const secoes = {};
  try {
    const sinal = AbortSignal.timeout(15000); // os GETs, todos juntos
    const html = async (resposta) => {
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      return new DOMParser().parseFromString(await resposta.text(), 'text/html');
    };
    if (renovacao) {
      const pagina = await html(await fetch(`/saude/prescription_renewals/${renovacao[1]}`, { signal: sinal }));
      id = pagina.querySelector('input[type="hidden"][name="prescription_renewal[patient_id]"]')?.getAttribute('value') ?? '';
    }
    if (/^\d+$/.test(id)) {
      const cadastro = await html(await fetch(`/saude/patients/${id}`, { signal: sinal }));
      for (const fieldset of cadastro.querySelectorAll('fieldset')) {
        const secao = normalizar(fieldset.querySelector('legend')?.textContent);
        for (const rotulo of fieldset.querySelectorAll('label.display-field-label')) {
          secoes[`${secao}: ${normalizar(rotulo.textContent)}`] = rotulo.nextElementSibling?.getAttribute('value') ?? '';
        }
      }
      // Fora de fieldset, como a data de nascimento: só o rótulo.
      for (const rotulo of cadastro.querySelectorAll('label.display-field-label')) {
        if (!rotulo.closest('fieldset')) secoes[normalizar(rotulo.textContent)] = rotulo.nextElementSibling?.getAttribute('value') ?? '';
      }
    }
  } catch {
    // o cadastro vai vazio
  }
  const doCadastro = (chave) => secoes[chave] ?? '';
  if (upa) {
    lido.nascimento = doCadastro('data de nascimento');
    lido.cpf = doCadastro('documentos basicos: cpf');
  }
  lido = {
    tela: soap ? 'soap' : upa ? 'upa' : 'renovacao',
    ...lido,
    cadastro: {
      municipio: doCadastro('endereco: municipio'),
      logradouro: doCadastro('endereco: logradouro'),
      numero: doCadastro('endereco: numero'),
      complemento: doCadastro('endereco: complemento'),
      bairro: doCadastro('endereco: bairro'),
      telefone: doCadastro('contato: telefone'),
      celular: doCadastro('contato: celular'),
      outrosTelefones: doCadastro('contato: outros telefones'),
    },
  };

  mensagem = { tipo: 'atendimento', versao: 1, lidoEm, lido, prescritor: config.prescritor, unidade: escolhida.unidade };
  enviar();
}

export const linkDoFavorito = (config) => 'javascript:' + encodeURIComponent(`void (${favorito})(${JSON.stringify(config)})`);
