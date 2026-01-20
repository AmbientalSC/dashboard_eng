import { CollectionManager } from '../admin/components/CollectionManager';

export const ResidueCategoriesManager = () => (
  <CollectionManager
    collectionPath="residuos_categorias"
    title="Categorias de resíduos"
    description="Organize os registros em grupos (ex.: geração, coletados, recebidos). As categorias aparecem como blocos no formulário."
    inputLabel="Nova categoria"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhuma categoria cadastrada até o momento."
    warningDeleteMessage='Tem certeza que deseja remover a categoria "{item}"? As linhas vinculadas permanecerão com essa referência.'
  />
);
