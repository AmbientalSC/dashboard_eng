import { CollectionManager } from '../admin/components/CollectionManager';

export const EnergyCategoriesManager = () => (
  <CollectionManager
    collectionPath="energia_categorias"
    title="Categorias de energia"
    description="Agrupe os indicadores de energia em categorias personalizadas."
    inputLabel="Nova categoria de energia"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhuma categoria cadastrada até o momento."
    warningDeleteMessage='Tem certeza que deseja remover a categoria "{item}"? As linhas vinculadas permanecerão com essa referência.'
  />
);
