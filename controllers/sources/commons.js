// Models
const Source = require('./../../models/sourceModel');
const Tender = require('./../../models/tenderModel');

exports.updateSource = async function (tender, sourceName, body) {
  const existingSource = tender.sources.find((el) => el.name === sourceName);

  if (existingSource) {
    return tender;
  }

  // Get new source
  const newSource = this.getSource(sourceName, body);

  tender = await Tender.findByIdAndUpdate(
    tender.id,
    { $push: { sources: newSource } },
    { new: true },
  );
  return tender;
};

exports.getSource = function (sourceName, body) {
  switch (sourceName) {
    case 'Plataforma de Contratación del Sector Público':
      return {
        name: 'Plataforma de Contratación del Sector Público',
        country: 'Spain',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };

    case 'Contratos Menores':
      return {
        name: 'Contratos Menores',
        country: 'Spain',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };

    case 'Boletín Oficial del Estado':
      return {
        name: 'Boletín Oficial del Estado',
        country: 'Spain',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };

    case 'Diário da República Electrónico':
      return {
        name: 'Diário da República Electrónico',
        country: 'Portugal',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };

    case 'Tenders Electronic Daily':
      return {
        name: 'Tenders Electronic Daily',
        country: 'Europe',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };
    case 'Gencat':
      return {
        name: 'Gencat',
        country: 'Spain',
        sourceUrl: body.sourceUrl,
        linkUrl: body.linkUrl,
        body: JSON.stringify(body),
      };
  }
};
