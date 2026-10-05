/* ============================================================
 * ruta-data.js — Currículo de la Ruta SQL + Power BI
 * Arquitectura: datos estáticos separados de la lógica (app.js)
 * y del estado del usuario (LocalStorage). Para personalizar
 * tu ruta, edita solo este archivo: módulos -> semanas -> topics.
 * IDs estables: no los cambies si ya tienes avance guardado.
 * ============================================================ */
const RUTA = {
  version: 1,
  modulos: [
    {
      id: "m1",
      titulo: "Módulo 1 · Fundamentos SQL",
      desc: "Leer y filtrar datos como un analista.",
      semanas: [
        {
          id: "s1", titulo: "Semana 1 · SELECT desde cero",
          objetivo: "Traer tablas, filtrar y ordenar sin miedo.",
          topics: [
            { id: "s1-t1", text: "SELECT, WHERE, ORDER BY, LIMIT/OFFSET" },
            { id: "s1-t2", text: "Operadores: =, <>, LIKE, IN, BETWEEN, IS NULL" },
            { id: "s1-t3", text: "DISTINCT + alias (AS) legibles" },
            { id: "s1-t4", text: "Ejercicios: 20 queries en SoloLearn / SQLBolt" },
          ],
          habitoSugerido: "SoloLearn: 10 min",
        },
        {
          id: "s2", titulo: "Semana 2 · JOINs + Agregaciones",
          objetivo: "Unir tablas y resumir como en reportes reales.",
          topics: [
            { id: "s2-t1", text: "INNER / LEFT / RIGHT / FULL JOIN" },
            { id: "s2-t2", text: "COUNT, SUM, AVG, MIN, MAX + GROUP BY + HAVING" },
            { id: "s2-t3", text: "CASE WHEN para segmentar clientes" },
            { id: "s2-t4", text: "Mini-reto: reporte de ventas por categoría" },
          ],
          habitoSugerido: "Podcast datos: 1 capítulo",
        },
        {
          id: "s3", titulo: "Semana 3 · Subqueries, CTEs y Ventanas",
          objetivo: "Queries de nivel entrevista técnica.",
          topics: [
            { id: "s3-t1", text: "Subqueries + EXISTS / NOT EXISTS" },
            { id: "s3-t2", text: "CTEs con WITH (queries legibles)" },
            { id: "s3-t3", text: "Window: ROW_NUMBER, RANK, LAG/LEAD, SUM OVER" },
            { id: "s3-t4", text: "Vistas (VIEW) + reto HackerRank SQL" },
          ],
          habitoSugerido: "SoloLearn: 10 min",
        },
      ],
    },
    {
      id: "m2",
      titulo: "Módulo 2 · SQL Pro + Modelado",
      desc: "Diseñar, optimizar y automatizar.",
      semanas: [
        {
          id: "s4", titulo: "Semana 4 · Diseño y Modelo relacional",
          objetivo: "Entender cómo nace una base sana.",
          topics: [
            { id: "s4-t1", text: "PK/FK + tipos de relaciones 1:N, N:M" },
            { id: "s4-t2", text: "Normalización 1FN–3FN con ejemplo propio" },
            { id: "s4-t3", text: "Índices: cuándo ayudan y cuándo estorban" },
            { id: "s4-t4", text: "Transacciones: BEGIN/COMMIT/ROLLBACK" },
          ],
          habitoSugerido: "Leer 5 min docs / artículo",
        },
        {
          id: "s5", titulo: "Semana 5 · Proyecto SQL + Optimización",
          objetivo: "Portafolio: análisis completo en SQL.",
          topics: [
            { id: "s5-t1", text: "Funciones fecha y texto (DATE_TRUNC, SUBSTR…)" },
            { id: "s5-t2", text: "Procedimientos y funciones básicas" },
            { id: "s5-t3", text: "EXPLAIN + optimización de un query lento" },
            { id: "s5-t4", text: "Proyecto: dataset real + 10 insights en SQL" },
          ],
          habitoSugerido: "Code review propio: 10 min",
        },
      ],
    },
    {
      id: "m3",
      titulo: "Módulo 3 · Power BI de cero a Dashboard",
      desc: "Del dato crudo al dashboard que consigue empleo.",
      semanas: [
        {
          id: "s6", titulo: "Semana 6 · Power Query + Modelo estrella",
          objetivo: "Datos limpios y modelo correcto.",
          topics: [
            { id: "s6-t1", text: "Conectar CSV/SQL + Power Query: limpiar, tipos, unpivot" },
            { id: "s6-t2", text: "Modelo estrella: hechos vs dimensiones" },
            { id: "s6-t3", text: "Relaciones, cardinalidad y tablas calendario" },
            { id: "s6-t4", text: "Lenguaje M básico: 3 transformaciones" },
          ],
          habitoSugerido: "SoloLearn Power BI: 10 min",
        },
        {
          id: "s7", titulo: "Semana 7 · DAX + Visualización",
          objetivo: "Medidas que responden preguntas de negocio.",
          topics: [
            { id: "s7-t1", text: "Medidas vs columnas calculadas; SUM, AVERAGE, DIVIDE" },
            { id: "s7-t2", text: "CALCULATE + FILTER (el 80% de DAX)" },
            { id: "s7-t3", text: "Time intelligence: TOTALYTD, SAMEPERIODLASTYEAR" },
            { id: "s7-t4", text: "Visuales: formato, tooltips, slicers" },
          ],
          habitoSugerido: "Practicar 1 medida DAX/día",
        },
        {
          id: "s8", titulo: "Semana 8 · Dashboard final + Publicación",
          objetivo: "Proyecto publicable en portafolio/LinkedIn.",
          topics: [
            { id: "s8-t1", text: "UX de dashboard: layout, tema, accesibilidad" },
            { id: "s8-t2", text: "RLS (seguridad por rol) básico" },
            { id: "s8-t3", text: "Publicar en Service + refresh programado" },
            { id: "s8-t4", text: "Proyecto final + video/gif demo para portafolio" },
          ],
          habitoSugerido: "Podcast / video BI: 1 capítulo",
        },
      ],
    },
  ],
};
