import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  type DocumentReference,
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { db } from '../../../firebase/app';

interface MonthlyCost {
  month: string;
  total: number;
  energia: number;
  agua: number;
  residuos: number;
  servicos: number;
}

interface MonthlyCostsByYear {
  [year: string]: MonthlyCost[];
}

interface UseMonthlyCostsResult {
  loading: boolean;
  data: MonthlyCostsByYear;
  error?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  dayjs().month(index).format('MMM').toUpperCase(),
);

const emptyYearData = (): MonthlyCost[] =>
  Array.from({ length: 12 }, (_, index) => ({
    month: MONTHS[index],
    total: 0,
    energia: 0,
    agua: 0,
    residuos: 0,
    servicos: 0,
  }));

const sumSubcollectionValues = async (
  ref: DocumentReference,
  subcollection: string,
  fallbackFields: string[] = [],
) => {
  const snapshot = await getDocs(collection(ref, subcollection));
  return snapshot.docs.reduce((sum, docSnap) => {
    let value = docSnap.get('valor');
    if (typeof value !== 'number') {
      for (const field of fallbackFields) {
        const fallbackValue = docSnap.get(field);
        if (typeof fallbackValue === 'number') {
          value = fallbackValue;
          break;
        }
      }
    }
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
};

export const useMonthlyCosts = (
  filialId: string | null,
  years: number[],
): UseMonthlyCostsResult => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthlyCostsByYear>({});
  const [error, setError] = useState<string>();

  useEffect(() => {
    if ((!filialId || filialId === 'consolidado') && !years.length) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        let monthlyQuery;
        if (filialId === 'consolidado') {
          monthlyQuery = query(collection(db, 'indicadores_mensais'));
        } else if (filialId) {
          const filialRef = doc(db, 'filiais', filialId);
          monthlyQuery = query(
            collection(db, 'indicadores_mensais'),
            where('filial_ref', '==', filialRef),
          );
        } else {
          return; // Não deveria chegar aqui, mas mantemos por segurança.
        }
        const snapshot = await getDocs(monthlyQuery);

        const base = years.reduce<MonthlyCostsByYear>((acc, year) => {
          acc[String(year)] = emptyYearData();
          return acc;
        }, {});

        const monthlyTotals = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const docRef = docSnap.ref;
            const record = docSnap.data();
            const mesAno = record?.mes_ano as string | undefined;
            if (!mesAno) return null;

            const [yearStr, monthStr] = mesAno.split('-');
            const year = Number(yearStr);
            const monthIndex = Number(monthStr) - 1;
            if (!years.includes(year) || monthIndex < 0 || monthIndex > 11) return null;

            let energia = await sumSubcollectionValues(docRef, 'energia_itens');
            let agua = await sumSubcollectionValues(docRef, 'agua_itens');
            const residuosTotal = await sumSubcollectionValues(docRef, 'residuos', ['quantidade_kg', 'custo']);
            const servicosTotal = await sumSubcollectionValues(docRef, 'servicos_gerais', ['custo']);

            if (!energia && typeof record?.energia?.custo_total === 'number') {
              energia = record.energia.custo_total;
            }
            if (!agua && typeof record?.agua?.custo_total === 'number') {
              agua = record.agua.custo_total;
            }


            return {
              year,
              monthIndex,
              // corrigido: usar as variáveis calculadas acima (energia / agua)
              energia: typeof energia === 'number' ? energia : 0,
              agua: typeof agua === 'number' ? agua : 0,
              residuos: residuosTotal,
              servicos: servicosTotal,
            };
          }),
        );

        for (const entry of monthlyTotals) {
          if (!entry) continue;
          const { year, monthIndex, energia, agua, residuos, servicos } = entry;
          const yearKey = String(year);
          const monthData = base[yearKey]?.[monthIndex];
          if (!monthData) continue;
          monthData.energia = energia;
          monthData.agua = agua;
          monthData.residuos = residuos;
          monthData.servicos = servicos;
          monthData.total = energia + agua + residuos + servicos;
        }

        if (!cancelled) {
          setData(base);
        }
      } catch (err) {
        console.error('Erro ao carregar custos mensais', err);
        if (!cancelled) setError('Não foi possível carregar os dados.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [filialId, years]);

  const memoData = useMemo(() => data, [data]);

  return {
    loading,
    data: memoData,
    error,
  };
};
