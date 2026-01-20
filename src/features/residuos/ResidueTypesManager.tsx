import { CollectionManager } from '../admin/components/CollectionManager';

export const ResidueTypesManager = () => (
  <CollectionManager
    collectionPath="residuos_tipos"
    title="Tipos de resíduos"
    description="Cadastre os tipos de resíduos disponíveis para seleção durante o lançamento."
    inputLabel="Novo tipo de resíduo"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhum tipo cadastrado até o momento."
  />
);
