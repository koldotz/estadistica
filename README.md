# Estadística Armairua

App de estudio de **Fundamentos de Estadística** (Grado en Psicología, VIU · curso 2026-2027).
Un solo `index.html` sin empaquetador, en la misma línea que
[euskara-armairua](https://github.com/koldotz/euskara-armairua).

**Examen: 11 de diciembre de 2026.**

## Qué contiene

| Sección | Qué hay |
|---|---|
| **Calendario** | 67 sesiones de 1 h, de lunes a viernes, del 7 de septiembre al 11 de diciembre. Contenido y tarea por día, con notas propias y marcado de sesión hecha. |
| **Temas** | Los cinco temas con teoría por epígrafes, glosario y casos prácticos resueltos, cada uno con su ruta de SPSS y su equivalente en Excel. |
| **Fórmulas** | Las 22 fórmulas del formulario oficial del examen, en su mismo orden: lectura en palabras, símbolos, cuándo se aplica, enlace al glosario del tema, caso resuelto y error frecuente. |
| **Ejercicios** | 60 preguntas —verdadero/falso, test de tres alternativas con el porqué de cada opción y desarrollo con respuesta modelo— corregidas con el criterio real del examen (aciertos − errores/2), más el registro de simulacros. |
| **Recordatorio** | Formulario completo, símbolos población/muestra, tabla de decisión, Tabla A de la normal, tabla t de Student y las trampas que más caen. |

## Puesta en marcha

La app funciona tal cual: abre `index.html` o entra en
`https://koldotz.github.io/estadistica/`. Sin configurar nada, el progreso se
guarda en el navegador que estés usando.

### Sincronizar entre ordenador y móvil (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com) llamado `estadistica`.
2. **SQL Editor → New query**, pega el contenido de [`schema.sql`](schema.sql) y ejecútalo.
3. **Project Settings → API**, copia *Project URL* y la clave *anon public*.
4. Pégalas en [`config.js`](config.js) y sube el cambio.
5. En la app, pulsa **Entrar** arriba a la derecha y escribe tu nombre. Ese nombre es la llave:
   escríbelo igual en el móvil y verás el mismo progreso.

Se sincronizan las sesiones marcadas, las respuestas de los ejercicios, las notas por sesión
y por tema, y el registro de simulacros.

> **Sobre la seguridad:** no hay contraseña. La clave `anon` es pública por diseño y las
> políticas de `schema.sql` permiten leer y escribir a quien tenga la URL y esa clave.
> Es razonable para datos de estudio; no guardes aquí nada personal. Nunca pongas en
> `config.js` la clave `service_role`.

## Estructura

```
index.html              la app entera (contenido, estilos y lógica)
config.js               credenciales de Supabase (vacías por defecto)
estadistica-cloud.js    capa de sincronización, sin dependencias
schema.sql              tablas y políticas de Supabase
```

## Contenido

Material propio de estudio elaborado a partir de los temas 1 a 5 de la asignatura y del
formulario oficial. Las diapositivas originales no se incluyen en el repositorio.
