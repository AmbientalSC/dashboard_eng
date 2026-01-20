import { CollectionManager } from '../admin/components/CollectionManager';

export const WaterCategoriesManager = () => (
  <CollectionManager
    collectionPath="agua_categorias"
    title="Categorias de água"
    description="Agrupe os indicadores de água em categorias personalizadas."
    inputLabel="Nova categoria de água"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhuma categoria cadastrada até o momento."
    warningDeleteMessage='Tem certeza que deseja remover a categoria "{item}"? As linhas vinculadas permanecerão com essa referência.'
  />
);
