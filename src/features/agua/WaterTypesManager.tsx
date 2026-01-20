import { CollectionManager } from '../admin/components/CollectionManager';

export const WaterTypesManager = () => (
  <CollectionManager
    collectionPath="agua_tipos"
    title="Tipos de indicadores de água"
    description="Cadastre os tipos de indicadores que serão registrados na aba de água."
    inputLabel="Novo tipo de água"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhum tipo cadastrado até o momento."
  />
);
