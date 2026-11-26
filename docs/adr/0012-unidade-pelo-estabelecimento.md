# O Favorito confere a unidade pelo Estabelecimento do topo, e não pelo almoxarifado

O Favorito comparava o "Nome no iSaúde" da unidade com `appContext.warehouse.name`. Na UPA esse nome é o do almoxarifado
("Almoxarifado Farmácia Central"), que não é o Estabelecimento mostrado no topo ("{Estabelecimento} - {Setor}") e que
provavelmente se repete em outras unidades, e o Favorito aceitaria a unidade errada ou recusaria a certa. Decidimos
conferir pelo Estabelecimento do topo (`#modal_edit_user_setting`, antes do " - Setor"), como já pedia a ajuda da página
"Criar o favorito".

## Consequences

- Todo Favorito precisa ser recriado, o que já aconteceria para aceitar a tela da UPA.
- Antes de publicar, conferir na USF se o Estabelecimento do topo bate com o nome de unidade já usado lá
  (`docs/pesquisa/tela-da-upa.md`).
