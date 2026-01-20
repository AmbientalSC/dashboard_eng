import { CollectionManager } from '../admin/components/CollectionManager';

export const ServiceTypesManager = () => (
  <CollectionManager
    collectionPath="servicos_tipos"
    title="Tipos de serviços"
    description="Cadastre os tipos de serviços disponíveis para seleção durante o lançamento de indicadores."
    inputLabel="Novo tipo de serviço"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhum tipo cadastrado até o momento."
  />
);
