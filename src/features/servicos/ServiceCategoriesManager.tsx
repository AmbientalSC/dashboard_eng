import { CollectionManager } from '../admin/components/CollectionManager';

export const ServiceCategoriesManager = () => (
  <CollectionManager
    collectionPath="servicos_categorias"
    title="Categorias de serviços"
    description="Defina categorias para agrupar os serviços registrados no lançamento mensal."
    inputLabel="Nova categoria"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhuma categoria cadastrada até o momento."
    warningDeleteMessage='Tem certeza que deseja remover a categoria "{item}"? As linhas vinculadas permanecerão com essa referência.'
  />
);
