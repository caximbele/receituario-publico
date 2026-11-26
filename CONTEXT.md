# Receituário

Página que monta e imprime as Receitas de alta a partir do atendimento aberto no iSaúde, com as regras das normas
sanitárias. O glossário completo da Fase 1 a 3 ficou no repositório "prescritor"; aqui estão os termos que o prescritor
da UPA usa ou acrescenta.

## O que a página monta

**Item**:
Um medicamento da Receita, com Produto (ou texto livre), Dose, Via de administração, Posologia e duração.
_Avoid_: linha, medicação

**Produto**:
Uma apresentação do catálogo do CATMAT: princípio ativo, concentração, forma e Unidade de fornecimento.
_Avoid_: material, medicamento (para o registro do catálogo)

**Tipo de receituário**:
A classe da Receita que o Item exige: simples, de antimicrobiano, de agonista de GLP-1 ou de Controle Especial.
_Avoid_: Tipo de Receita do iSaúde (A, B, Especial, Simples), que é outra classificação

**Receita de alta**:
O que o paciente leva para comprar ou retirar na farmácia, com Quantidade a dispensar e Vias. É a única Receita que a
página monta.
_Avoid_: prescrição (no iSaúde, "Prescrição" é a aba de uso interno)

**Prescrição de uso interno**:
A medicação aplicada na própria unidade, ordem para a enfermagem, na aba Prescrição do iSaúde. Fora do escopo.
_Avoid_: receita interna

## Os Padrões

**Padrão**:
Um Item pronto, de Produto do catálogo, com Dose, Via, Posologia, duração e, se preciso, Recomendações definidas pelo
Prescritor, que preenche o formulário do Novo item.
_Avoid_: favorito, protocolo, kit, prescrição padrão

**Grupo**:
O rótulo que reúne Padrões na tela, como "Dor e febre" ou "Antibióticos". Não é uma Receita nem um conjunto que entra de
uma vez.
_Avoid_: categoria, queixa, conjunto

**Receitas Padrões do iSaúde**:
O recurso do próprio iSaúde que acrescenta itens à grade do Receituário do iSaúde. Não é o Padrão desta página.
_Avoid_: Padrão (para elas)

## O iSaúde

**Favorito**:
O link da barra de favoritos do Chrome que, clicado numa Tela de atendimento, confere o Prescritor e a unidade e manda o
paciente para a página.
_Avoid_: bookmarklet, atalho

**Tela de atendimento**:
A tela do iSaúde em que o Favorito é clicado: a SOAP da atenção básica, a Renovação de receita e a da UPA ("Atendimentos
de Consultório").
_Avoid_: prontuário, ficha

**Estabelecimento**:
A unidade de saúde em que o profissional está logado, mostrada no topo do iSaúde antes do " - Setor".
_Avoid_: almoxarifado, warehouse, setor
