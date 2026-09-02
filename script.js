const SHEET_ID = '1igJ0rzEp3txMDdhjwjrMB5V9BkJcyjt74g1xWh3YSHo';
const SHEET_NAME = 'Master Stock';

let rows = [];

const $ = (id) => document.getElementById(id);

function esc(x) {
  return String(x ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m])
  );
}

function val(r, ...names) {
  for (const n of names) {
    if (
      r[n] !== undefined &&
      r[n] !== null &&
      String(r[n]).trim() !== ''
    ) {
      return String(r[n]).trim();
    }
  }
  return '';
}

function num(x) {
  const n = parseFloat(String(x ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isTrue(x) {
  return /^(true|yes|y|1|under\s*cover|due|required)$/i.test(
    String(x).trim()
  );
}

function commodity(r) {
  return val(
    r,
    'Commodity / Crop Year',
    'Commodity/Crop Year',
    'Commodity',
    'Crop Year'
  );
}

function isRice(r) {
  return /rice|frk|rra/i.test(commodity(r));
}

function receipt(r) {
  return val(
    r,
    'Receipt Date',
    'RDate of Receipt',
    'RDate'
  );
}

function parseDate(s) {
  s = String(s || '').trim();

  if (!s) return null;

  // dd.mm.yy / dd-mm-yyyy / dd/mm/yyyy
  let m = s.match(
    /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/
  );

  if (m) {
    let day = Number(m[1]);
    let month = Number(m[2]) - 1;
    let year = Number(m[3]);

    if (year < 100) year += 2000;

    const d = new Date(year, month, day);

    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(s);

  return isNaN(d.getTime()) ? null : d;
}

function dateKey(s) {
  const d = parseDate(s);
  return d ? d.getTime() : Infinity;
}

function daysSince(s) {
  const d = parseDate(s);

  if (!d) return '';

  const now = new Date();

  const a = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );

  const b = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return Math.max(
    0,
    Math.floor((b - a) / 86400000)
  );
}

function fumDate(r) {
  return val(
    r,
    'Fumigation Date',
    'FumigationDate',
    'Fumigation Date '
  );
}

function lastFum(r) {
  return (
    val(
      r,
      'LAST FUMIGATION',
      'Last Fumigation',
      'Last Fumigation Date'
    ) || fumDate(r)
  );
}

function rowEmpty(cols) {
  return `
    <tr>
      <td colspan="${cols}" class="empty">
        No matching stack found.
      </td>
    </tr>
  `;
}

/* =========================
   LOAD GOOGLE SHEET DATA
========================= */

async function loadData() {

  const status = $('status');

  if (status) {
    status.textContent =
      'Connecting to Google Sheet…';
  }

  try {

    const url =
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}` +
      `/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

    const response = await fetch(
      url,
      {
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(
        'Google Sheet HTTP ' + response.status
      );
    }

    const text = await response.text();

    const match = text.match(
      /google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s
    );

    if (!match) {
      throw new Error(
        'Invalid Google Sheets response'
      );
    }

    const json = JSON.parse(match[1]);

    const columns =
      json.table.cols.map(
        c => (c.label || '').trim()
      );

    rows = json.table.rows
      .map(row => {

        const obj = {};

        columns.forEach((column, index) => {

          const cell = row.c[index];

          obj[column] =
            cell
              ? ((cell.f ?? cell.v) ?? '')
              : '';

        });

        return obj;

      })
      .filter(row => {

        const stack =
          val(
            row,
            'Stack No.',
            'Stack No'
          );

        const qty =
          num(
            val(
              row,
              'Qty (MT)',
              'Qty',
              'Quantity'
            )
          );

        return stack && qty > 0;

      });

    if (status) {

      status.textContent =
        `✓ Live data connected • ${rows.length} active stacks`;

    }

    if ($('updated')) {

      $('updated').textContent =
        new Date().toLocaleString(
          'en-IN',
          {
            dateStyle: 'short',
            timeStyle: 'medium'
          }
        );

    }

    renderAll();

  } catch (error) {

    console.error(
      'Google Sheet Error:',
      error
    );

    if (status) {

      status.textContent =
        '⚠ Google Sheet data could not be read. ' +
        'Check that Master Stock is shared as Viewer.';

    }

    rows = [];

    renderAll();

  }
}

/* =========================
   RENDER EVERYTHING
========================= */

function renderAll() {

  const under =
    rows.filter(r =>
      isTrue(
        val(
          r,
          'UnderCover_Flag',
          'Under Cover',
          'UnderCover'
        )
      )
    );

  const fum =
    rows.filter(r =>
      isTrue(
        val(
          r,
          'FumigationDue_>30D_Flag',
          'Fumigation Due',
          'FumigationDue'
        )
      )
    );

  const wheat =
    rows.filter(r => !isRice(r));

  const rice =
    rows.filter(r => isRice(r));

  if ($('total'))
    $('total').textContent = rows.length;

  if ($('wheat'))
    $('wheat').textContent = wheat.length;

  if ($('rice'))
    $('rice').textContent = rice.length;

  if ($('underCount'))
    $('underCount').textContent = under.length;

  if ($('fumCount'))
    $('fumCount').textContent = fum.length;

  if ($('underTotal'))
    $('underTotal').textContent = under.length;

  if ($('fumTotal'))
    $('fumTotal').textContent = fum.length;

  renderUnder(under);
  renderFum(fum);
  renderPriority();
}

/* =========================
   UNDER COVER
========================= */

function renderUnder(
  data = rows.filter(r =>
    isTrue(
      val(
        r,
        'UnderCover_Flag',
        'Under Cover',
        'UnderCover'
      )
    )
  )
) {

  const body = $('underBody');

  if (!body) return;

  if (!data.length) {

    body.innerHTML = rowEmpty(7);
    return;

  }

  body.innerHTML =
    data.map((r, i) => {

      return `
        <tr>
          <td>${i + 1}</td>

          <td>
            ${esc(
              val(
                r,
                'Shed No.',
                'Shed No'
              )
            )}
          </td>

          <td>
            <b>
              ${esc(
                val(
                  r,
                  'Stack No.',
                  'Stack No'
                )
              )}
            </b>
          </td>

          <td>
            ${esc(receipt(r))}
          </td>

          <td>
            ${esc(commodity(r))}
          </td>

          <td>
            ${esc(fumDate(r))}
          </td>

          <td>
            ${daysSince(fumDate(r))}
          </td>
        </tr>
      `;

    }).join('');
}

/* =========================
   FUMIGATION DUE
========================= */

function renderFum(
  data = rows.filter(r =>
    isTrue(
      val(
        r,
        'FumigationDue_>30D_Flag',
        'Fumigation Due',
        'FumigationDue'
      )
    )
  )
) {

  const body = $('fumBody');

  if (!body) return;

  if (!data.length) {

    body.innerHTML = rowEmpty(7);
    return;

  }

  body.innerHTML =
    data.map((r, i) => {

      return `
        <tr>

          <td>${i + 1}</td>

          <td>
            ${esc(
              val(
                r,
                'Shed No.',
                'Shed No'
              )
            )}
          </td>

          <td>
            <b>
              ${esc(
                val(
                  r,
                  'Stack No.',
                  'Stack No'
                )
              )}
            </b>
          </td>

          <td>
            ${esc(receipt(r))}
          </td>

          <td>
            ${esc(commodity(r))}
          </td>

          <td>
            ${esc(lastFum(r))}
          </td>

          <td class="danger">
            ${daysSince(lastFum(r))}
          </td>

        </tr>
      `;

    }).join('');
}

/* =========================
   PRIORITY VIEW - FIFO
========================= */

function renderPriority() {

  const filter =
    $('priorityFilter')
      ? $('priorityFilter').value
      : 'wheat';

  let data =
    rows
      .slice()
      .filter(r => receipt(r))
      .sort(
        (a, b) =>
          dateKey(receipt(a)) -
          dateKey(receipt(b))
      );

  if (filter === 'wheat') {

    data =
      data.filter(
        r => !isRice(r)
      );

  }

  if (filter === 'rice') {

    data =
      data.filter(
        r => isRice(r)
      );

  }

  const body =
    $('priorityBody');

  if (!body) return;

  if (!data.length) {

    body.innerHTML =
      rowEmpty(7);

  } else {

    body.innerHTML =
      data.map((r, i) => {

        return `
          <tr>

            <td>
              ${i + 1}
            </td>

            <td>
              ${esc(
                val(
                  r,
                  'Shed No.',
                  'Shed No'
                )
              )}
            </td>

            <td>
              <b>
                ${esc(
                  val(
                    r,
                    'Stack No.',
                    'Stack No'
                  )
                )}
              </b>
            </td>

            <td>
              ${esc(
                receipt(r)
              )}
            </td>

            <td>
              ${esc(
                commodity(r)
              )}
            </td>

            <td>
              ${esc(
                val(
                  r,
                  'Qty (MT)',
                  'Qty',
                  'Quantity'
                )
              )}
            </td>

            <td>
              ${esc(
                val(
                  r,
                  'Cat',
                  'Category'
                )
              )}
            </td>

          </tr>
        `;

      }).join('');

  }

  const name =
    filter === 'rice'
      ? 'Rice / FRK RRA'
      : filter === 'all'
        ? 'All'
        : 'Wheat';

  const total =
    $('priorityTotal');

  if (total) {

    total.innerHTML =
      `Total ${name} Stacks: <b>${data.length}</b>`;

  }
}

/* =========================
   START + AUTO REFRESH
========================= */

loadData();

setInterval(
  loadData,
  30000
);
