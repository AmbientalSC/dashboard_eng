import { CollectionManager } from '../admin/components/CollectionManager';

export const EnergyTypesManager = () => (
  <CollectionManager
    collectionPath="energia_tipos"
    title="Tipos de indicadores de energia"
    description="Cadastre os tipos de indicadores que serão registrados na aba de energia."
    inputLabel="Novo tipo de energia"
    addButtonLabel="Adicionar"
    emptyMessage="Nenhum tipo cadastrado até o momento."
  />
);
