# A tela de atendimento da UPA no iSaúde

Observada em 26/11/2026, só lendo a página: nenhum clique em gravar, nenhum POST. Do atendimento aberto (um paciente
real) foram lidos só os ids, os rótulos e o formato dos campos, nunca os valores. O formato do cadastro veio do paciente
teste (261622, fictício).

## A tela

- URL: `/saude/receptions/{recepção}/clinical_attendances/{atendimento}/edit`, título "Atendimentos de Consultório".
  O Favorito de hoje só aceita `soap_attendances` e `prescription_renewals` e recusa esta tela.
- Abas: Evolução Médica, Atendimento, Anamnese, Procedimentos, Histórico, Prescrição, Receituário, Exames, Solicitação de
  Internação, Atestado, Problemas / Condições e Alergias, Sinais e Queixas, Conduta, Programa de saúde.
- A aba Receituário tem a grade de itens, o botão **Receituário Padrão** e o **Receituário Manual** (descrição, Tipo de
  Receita, "Imprimir data de emissão no receituário"). O Texto para colar vai para o Receituário Manual, como na SOAP.

## O paciente na tela

| Dado | Onde | Formato |
|---|---|---|
| Nome | `#patient-header h3` | "{prontuário} - {NOME}", como na SOAP |
| Id do paciente | `#clinical_attendance_patient_id` (oculto) | número |
| Sexo | `<select id="clinical_attendance_patient_gender">` | valor `female`/`male`; o texto da opção é "Feminino"/"Masculino" |
| CNS | `#clinical_attendance_patient_sus_nacional_card` | 15 dígitos, sem espaços |
| Idade | `#clinical_attendance_patient_age` | texto "99 Ano(s) 99 Mês(es) e 9 Dia(s)" |
| Prontuário | `#clinical_attendance_patient_medical_card` | número |
| Data de nascimento | **não está na tela** | — |
| CPF | **não está na tela** (o `…drug_recomendations_attributes_0_cpf` é do item do Receituário do iSaúde, em branco) | — |

## O cadastro (`GET /saude/patients/{id}`), que o Favorito já lê

- `label.display-field-label` seguido de `input.display-field` com o valor no atributo `value`.
- **Data de nascimento**: rótulo "Data de nascimento", **fora de qualquer fieldset**, em "dd/mm/aaaa". O Favorito de
  hoje só junta os rótulos de dentro dos fieldsets, e por isso não a pega.
- **CPF**: fieldset "Documentos básicos", rótulo "CPF", em "999.999.999-99". O CNS também está lá.
- Endereço e Contato: os mesmos fieldsets que o Favorito já lê.

## A unidade logada

- O topo mostra `#modal_edit_user_setting` = "{Estabelecimento de saúde} - {Setor}": na UPA,
  "UPA UNIDADE DE PRONTO ATENDIMENTO DE BRUMADINHO - UAI PIEDADE". Em `/saude/user_setting/edit` são dois campos:
  Estabelecimento de saúde ("92 - UPA UNIDADE DE PRONTO ATENDIMENTO DE BRUMADINHO") e Setor ("UAI PIEDADE").
- `appContext.warehouse.name`, que o Favorito compara com o "Nome no iSaúde" da unidade, é **"Almoxarifado Farmácia
  Central"** na UPA: o almoxarifado, e não o estabelecimento do topo. Com o nome do topo, como pede a ajuda da página
  "Criar o favorito", o Favorito recusaria a UPA ("Este favorito não tem a unidade em que você está logado").
- Logado na UPA, o atendimento SOAP da USF do paciente teste dá HTTP 401: não deu para conferir agora como a SOAP
  escreve o sexo nem o que o `warehouse` diz na USF.

## As Receitas Padrões do próprio iSaúde

- O iSaúde já tem "Receitas Padrões" (`/saude/standard_medical_prescriptions`): descrição, unidade, especialidade,
  profissional, tipo de prescrição, compartilhamento com outros usuários e, por medicamento, quantidade, dose,
  frequência, duração, quantidade total, uso contínuo, se dor, ACM, aplicação e observação.
- O botão Receituário Padrão da aba abre um diálogo que carrega
  `/saude/standard_medical_prescriptions/load_prescriptions?reception_id=…&item_id=…&source_type=DrugRecomendation…`
  e acrescenta os itens à grade do Receituário do iSaúde, que imprime pelo modelo do iSaúde.
- Há 2 páginas de Receitas Padrões de vários profissionais e unidades (por exemplo "GEA" e "Amigdalite", esta com o tipo
  "Especial", porque o iSaúde não tem o tipo antimicrobiano).
