export interface IndicatorsContext {
  filialId: string;
  filialNome: string;
  mesReferencia: string; // YYYY-MM
}

export interface IndicatorEntry {
  id: string;
  tipo: string;
  categoriaId: string;
  valor: number | '';
  // fonte do dado: controla de onde o item pode ser importado/representa a origem
  fonteDado?: 'manual' | 'energia' | 'agua' | 'residuos' | 'servicos' | string;
}
