import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import url from 'url';
import { Panel, PanelBody } from '../libs/bootstrap/panel';
import { auditDecor } from './audit';
import { Document, DocumentPreview, DocumentFile, DocumentsPanel } from './doc';
import { FetchedData, Param } from './fetched';
import * as globals from './globals';
import { ProjectBadge } from './image';
import { RelatedItems } from './item';
import { Breadcrumbs } from './navigation';
import { singleTreatment } from './objectutils';
import { PickerActions } from './search';
import { SortTablePanel, SortTable } from './sorttable';
import StatusLabel from './statuslabel';
import { BiosampleTable, DonorTable } from './typeutils';


// Generate a <dt>/<dd> combination to render GeneticModification.epitope_tags into a <dl>. If no
// epitope_tags exist in the given genetic modification object, nothing gets rendered.
const IntroducedTags = (props) => {
    const { geneticModification } = props;

    if (geneticModification.introduced_tags && geneticModification.introduced_tags.length) {
        // Generate an array of React components, each containing one epitope_tags display from
        // the array of epitope_tags in the given genetic modification object. At least one
        // property of each epitope tag element must be present, or else an empty <li></li> will
        // get generated. Seems unlikely to have an empty epitope_tags element in the array, so
        // this currently seems like a good assumption.
        const elements = geneticModification.introduced_tags.map((tag, i) => {
            const targetName = tag.promoter_used ? globals.atIdToAccession(tag.promoter_used) : '';
            const name = tag.name ? <span>{tag.name}</span> : null;
            const location = tag.location ? <span>{name ? <span> &mdash; </span> : null}{tag.location}</span> : null;
            const promoterUsed = tag.promoter_used ? <span>{name || location ? <span> &mdash; </span> : null}<a href={tag.promoter_used} title={`View page for target ${targetName}`}>{targetName}</a></span> : null;
            return <li key={i}>{name}{location}{promoterUsed}</li>;
        });

        // Return a <div> to get rendered within a <dl> being displayed for the given genetic
        // modification.
        return (
            <div data-test="introducedtag">
                <dt>Tags</dt>
                <dd><ul className="multi-value">{elements}</ul></dd>
            </div>
        );
    }
    return null;
};

IntroducedTags.propTypes = {
    geneticModification: PropTypes.object.isRequired, // GeneticModification object being displayed
};


// Render the modification site items into a definition list.
const ModificationSiteItems = (props) => {
    const { geneticModification, itemClass } = props;

    const renderers = {
        modified_site_by_target_id: (gm) => {
            let targetName;
            let targetLink;

            if (typeof gm.modified_site_by_target_id === 'string') {
                // Non-embedded target; get its name from its @id.
                targetName = globals.atIdToAccession(gm.modified_site_by_target_id);
                targetLink = gm.modified_site_by_target_id;
            } else {
                // Embedded target; get its name from the embedded object.
                targetName = gm.modified_site_by_target_id.name;
                targetLink = gm.modified_site_by_target_id['@id'];
            }
            return (
                <div data-test="mstarget">
                    <dt>Target</dt>
                    <dd><a href={targetLink} title={`View page for target ${targetName}`}>{targetName}</a></dd>
                </div>
            );
        },
        modified_site_by_coordinates: (gm) => {
            const { assembly, chromosome, start, end } = gm.modified_site_by_coordinates;
            return (
                <div data-test="mscoords">
                    <dt>Coordinates</dt>
                    <dd>{`${assembly} chr${chromosome}:${start}-${end}`}</dd>
                </div>
            );
        },
        modified_site_by_sequence: gm => (
            <div data-test="msseq">
                <dt>Sequence</dt>
                <dd className="sequence">{gm.modified_site_by_sequence}</dd>
            </div>
        ),
        modified_site_nonspecific: gm => (
            <div data-test="msnonspec">
                <dt>Integration site</dt>
                <dd>{gm.modified_site_nonspecific}</dd>
            </div>
        ),
    };

    const elements = ['modified_site_by_target_id', 'modified_site_by_coordinates', 'modified_site_by_sequence', 'modified_site_nonspecific'].map((siteType) => {
        if (geneticModification[siteType]) {
            return <div key={siteType}>{renderers[siteType](geneticModification)}</div>;
        }
        return null;
    });

    return (
        <dl className={itemClass}>
            {elements}
        </dl>
    );
};

ModificationSiteItems.propTypes = {
    geneticModification: PropTypes.object.isRequired, // Genetic modification object whose modification_site we're rendering here
    itemClass: PropTypes.string, // CSS class string to add to <dl>
};

ModificationSiteItems.defaultProps = {
    itemClass: '',
};


// Display a section for the modification site data from the given genetic modification object. to
// render into the GM summary panel as its own section;
const ModificationSite = (props) => {
    const { geneticModification } = props;
    const itemClass = globals.itemClass(geneticModification, 'view-detail key-value');

    return (
        <div>
            <hr />
            <h4>Modification site</h4>
            <ModificationSiteItems geneticModification={geneticModification} itemClass={itemClass} />
        </div>
    );
};

ModificationSite.propTypes = {
    geneticModification: PropTypes.object.isRequired, // GM object with modification site data to display
};


// Render data for the Modification Technique section of the GM summary panel, for the given
// GeneticModification object.
const ModificationMethod = (props) => {
    const { geneticModification } = props;
    const itemClass = globals.itemClass(geneticModification, 'view-detail key-value');

    // Make an array of treatment text summaries within <li> elements that can get inserted
    // directly into a <ul> element.
    let treatments = [];
    if (geneticModification.treatments && geneticModification.treatments.length) {
        treatments = geneticModification.treatments.map(treatment => <li key={treatment.uuid}>{singleTreatment(treatment)}</li>);
    }

    return (
        <div>
            <hr />
            <h4>Modification method</h4>
            <dl className={itemClass}>
                <div data-test="technique">
                    <dt>Technique</dt>
                    <dd>{geneticModification.method}</dd>
                </div>

                {treatments.length ?
                    <div data-test="treatments">
                        <dt>Treatments</dt>
                        <dd>
                            <ul className="multi-value">
                                {treatments}
                            </ul>
                        </dd>
                    </div>
                : null}

                {geneticModification.rnai_sequences && geneticModification.rnai_sequences.length ?
                    <div data-test="rnai">
                        <dt>RNAi sequences</dt>
                        <dd>
                            <ul className="multi-value">
                                {geneticModification.rnai_sequences.join(', ')}
                            </ul>
                        </dd>
                    </div>
                : null}

                {geneticModification.guide_rna_sequences && geneticModification.guide_rna_sequences.length ?
                    <div data-test="guiderna">
                        <dt>Guide RNAs</dt>
                        <dd>
                            {geneticModification.guide_rna_sequences.join(', ')}
                        </dd>
                    </div>
                : null}

                {geneticModification.RVD_sequence_pairs && geneticModification.RVD_sequence_pairs.length ?
                    <div data-test="rvdseq">
                        <dt>RVD sequence pairs</dt>
                        <dd>
                            <ul className="multi-value">
                                {geneticModification.RVD_sequence_pairs.map((pair, i) => (
                                    <li key={i}>{pair.left_RVD_sequence} : {pair.right_RVD_sequence}</li>
                                ))}
                            </ul>
                        </dd>
                    </div>
                : null}

                {geneticModification.reagents && geneticModification.reagents.length ?
                    <div data-test="reagent">
                        <dt>Reagents</dt>
                        <dd>
                            <ul className="multi-value-line">
                                {geneticModification.reagents.map((reagent, i) => {
                                    const reagentId = <span>{globals.atIdToAccession(reagent.source)} &mdash; {reagent.identifier}</span>;
                                    if (reagent.url) {
                                        return <li key={i}><a href={reagent.url}>{reagentId}</a></li>;
                                    }
                                    return <li key={i}>{reagentId}</li>;
                                })}
                            </ul>
                        </dd>
                    </div>
                : null}
            </dl>
        </div>
    );
};

ModificationMethod.propTypes = {
    geneticModification: PropTypes.object.isRequired, // GM object being rendered
};


// Rendering component for the attribution pane of the summary panel. This gets called as a result
// of a successful GET request for the GM's award and lab objects which are no longer embedded in
// the GM object.
const AttributionRenderer = (props) => {
    const { geneticModification, award } = props;

    return (
        <div>
            <div className="flexcol-heading experiment-heading">
                <h4>Attribution</h4>
                <ProjectBadge award={award} addClasses="badge-heading" />
            </div>
            <dl className="key-value">
                <div data-test="lab">
                    <dt>Lab</dt>
                    <dd>{geneticModification.lab.title}</dd>
                </div>

                {award.pi && award.pi.lab ?
                    <div data-test="awardpi">
                        <dt>Award PI</dt>
                        <dd>{award.pi.lab.title}</dd>
                    </div>
                : null}

                <div data-test="project">
                    <dt>Project</dt>
                    <dd>{award.project}</dd>
                </div>

                {geneticModification.aliases && geneticModification.aliases.length ?
                    <div data-test="aliases">
                        <dt>Aliases</dt>
                        <dd>{geneticModification.aliases.join(', ')}</dd>
                    </div>
                : null}

                {geneticModification.submitter_comment ?
                    <div data-test="submittercomment">
                        <dt>Submitter comment</dt>
                        <dd>{geneticModification.submitter_comment}</dd>
                    </div>
                : null}
            </dl>
        </div>
    );
};

AttributionRenderer.propTypes = {
    geneticModification: PropTypes.object.isRequired, // GeneticModification object being displayed
    award: PropTypes.object, // Award object retreived from an individual GET request; don't make isRequired because React's static analysizer will ding it
};

AttributionRenderer.defaultProps = {
    award: null, // Actually required, but React can't tell this property's coming from a GET request, so treat as optional
};


// Display the contents of the attribution panel (currently the right-hand side of the summary
// panel) for the given genetic modification object. Because the award and lab informatino isn't
// embedded in the GM object, we have to retrieve it with a couple GET requests here, and have
// <AttributionRenderer> actually render the panel contents after the GET request completes.
const Attribution = (props) => {
    const { geneticModification } = props;

    return (
        <FetchedData>
            <Param name="award" url={geneticModification.award} />
            <AttributionRenderer geneticModification={geneticModification} />
        </FetchedData>
    );
};

Attribution.propTypes = {
    geneticModification: PropTypes.object.isRequired, // Genetic modificastion object for which we're getting the attribution information
};


const DocumentsRenderer = (props) => {
    let characterizations = [];

    // Get the document objects and convert to an object keyed by their @id for easy searching in
    // the next step.
    const modCharDocs = props.modCharDocs ? props.modCharDocs['@graph'] : [];
    const modCharDocsKeyed = {};
    modCharDocs.forEach((doc) => {
        modCharDocsKeyed[doc['@id']] = doc;
    });

    // Now go through the GM characterizations and replace any document @ids with the actual
    // document objects. This allows us to pass the characterizations array to `DocumentsPanel`
    // in a way it expects, with embedded documents that GM objects do not have.
    if (props.characterizations && props.characterizations.length) {
        // Clone the characterizations array so we don't mutate the original characterization objects
        // which causes problems if other props change which could happen if the user logs in while
        // viewing this page.
        characterizations = props.characterizations.map(characterization => Object.assign({}, characterization));

        // Now replace the characterization document array @ids with the actual document objects we
        // got from the GET request for documents.
        characterizations.forEach((characterization) => {
            if (characterization.documents && characterization.documents.length) {
                // We cloned the characterizations array, but each still refers to the original
                // characterizations.documents @id array that we're overwriting. Copy its reference
                // and then overwrite `characterization.documents` to prepare it to receive actual
                // document objects.
                const charDocs = characterization.documents;
                characterization.documents = [];

                // For each document in the current GM characterization, find its full object in
                // `modDocs` and copy that full object into the characterization document,
                // replacing the document's @id. Then delete the corresponding document in
                // `modDocs`.
                for (let i = 0; i < charDocs.length; i += 1) {
                    characterization.documents[i] = modCharDocsKeyed[charDocs[i]];
                }
            }
        });
    }

    // Now filter out any characterization documents out of modDocs.
    const modDocs = modCharDocs.filter(doc => props.charDocs.indexOf(doc['@id']) === -1);

    return (
        <DocumentsPanel
            documentSpecs={[
                { label: 'Characterizations', documents: characterizations },
                { label: 'Modification', documents: modDocs },
            ]}
        />
    );
};

DocumentsRenderer.propTypes = {
    modCharDocs: PropTypes.object, // GM document search results containing GM docs and GM characterization docs
    characterizations: PropTypes.array.isRequired, // GM characterizations
    charDocs: PropTypes.array.isRequired, // Array of @ids of docs belonging to all GM characterizations
};

DocumentsRenderer.defaultProps = {
    modCharDocs: null,
};


// Render the entire GeneticModification page. This is called by the back end as a result of an
// attempt to render an object with an @type of GeneticModification.
export const GeneticModificationComponent = (props, reactContext) => {
    const { context } = props;
    const itemClass = globals.itemClass(context, 'view-detail key-value');

    // Configure breadcrumbs for the page.
    const crumbs = [
        { id: 'Genetic Modifications' },
        { id: context.target && context.target.label, query: `target.label=${context.target && context.target.label}`, tip: context.target && context.target.label },
        { id: context.modification_type, query: `modification_type=${context.modification_type}`, tip: context.modification_type },
    ];

    // Collect and combine document @ids, including from genetic modification
    // characterization document @ids. Later we'll do a GET request on these @ids to show these
    // documents along with the embedded characterizations.
    let modDocs = context.documents && context.documents.length ? context.documents : [];
    let charDocs = [];
    if (context.characterizations && context.characterizations.length) {
        context.characterizations.forEach((characterization) => {
            if (characterization.documents && characterization.documents.length) {
                charDocs = charDocs.concat(characterization.documents);
            }
        });
    }
    modDocs = _.uniq(modDocs.concat(charDocs));

    // Convert the array of document @ids into a query string that we can do a GET request on.
    const modDocsQuery = modDocs.length ? modDocs.reduce((acc, document) => `${acc}&${globals.encodedURIComponent(`@id=${document}`)}`, '') : null;

    return (
        <div className={globals.itemClass(context, 'view-item')}>
            <header className="row">
                <div className="col-sm-12">
                    <Breadcrumbs root="/search/?type=GeneticModification" crumbs={crumbs} />
                    <h2>{context.accession}</h2>
                    <div className="status-line">
                        <div className="characterization-status-labels">
                            <StatusLabel title="Status" status={context.status} />
                        </div>
                        {props.auditIndicators(context.audit, 'genetic-modification-audit', { session: reactContext.session })}
                    </div>
                </div>
            </header>
            {props.auditDetail(context.audit, 'genetic-modification-audit', { session: reactContext.session, except: context['@id'] })}
            <Panel addClasses="data-display">
                <PanelBody addClasses="panel-body-with-header">
                    <div className="flexrow">
                        <div className="flexcol-sm-6">
                            <div className="flexcol-heading experiment-heading"><h4>Summary</h4></div>
                            <dl className={itemClass}>
                                {context.description ?
                                    <div data-test="description">
                                        <dt>Description</dt>
                                        <dd>{context.description}</dd>
                                    </div>
                                : null}

                                <div data-test="type">
                                    <dt>Type</dt>
                                    <dd>{context.category}</dd>
                                </div>

                                {context.introduced_sequence ?
                                    <div data-test="type">
                                        <dt>Introduced sequence</dt>
                                        <dd>{context.introduced_sequence ? <span>{context.introduced_sequence}</span> : null}</dd>
                                    </div>
                                : null}

                                {context.zygosity ?
                                    <div data-test="zygosity">
                                        <dt>Zygosity</dt>
                                        <dd>{context.zygosity}</dd>
                                    </div>
                                : null}

                                <IntroducedTags geneticModification={context} />

                                <div data-test="purpose">
                                    <dt>Purpose</dt>
                                    <dd>{context.purpose}</dd>
                                </div>
                            </dl>

                            <ModificationSite geneticModification={context} />

                            <ModificationMethod geneticModification={context} />
                        </div>

                        <div className="flexcol-sm-6">
                            <Attribution geneticModification={context} />
                        </div>
                    </div>
                </PanelBody>
            </Panel>

            {modDocsQuery || (context.characterizations && context.characterizations.length) ?
                <FetchedData>
                    {modDocsQuery ? <Param name="modCharDocs" url={`/search/?type=Document${modDocsQuery}`} /> : null}
                    <DocumentsRenderer characterizations={context.characterizations} charDocs={charDocs} />
                </FetchedData>
            : null}

            <RelatedItems
                title="Donors using this genetic modification"
                url={`/search/?type=Donor&genetic_modifications.uuid=${context.uuid}`}
                Component={DonorTable}
            />

            <RelatedItems
                title="Biosamples using this genetic modification"
                url={`/search/?type=Biosample&genetic_modifications.uuid=${context.uuid}`}
                Component={BiosampleTable}
            />
        </div>
    );
};

GeneticModificationComponent.propTypes = {
    context: PropTypes.object.isRequired, // GM object being displayed
    auditIndicators: PropTypes.func.isRequired, // Audit HOC function to display audit indicators
    auditDetail: PropTypes.func.isRequired, // Audit HOC function to display audit details
};

GeneticModificationComponent.contextTypes = {
    session: PropTypes.object, // Login information from <App>
};

const GeneticModification = auditDecor(GeneticModificationComponent);

globals.contentViews.register(GeneticModification, 'GeneticModification');


const ListingComponent = (props, reactContext) => {
    const result = props.context;

    return (
        <li>
            <div className="clearfix">
                <PickerActions {...props} />
                <div className="pull-right search-meta">
                    <p className="type meta-title">Genetic modification</p>
                    <p className="type">{` ${result.accession}`}</p>
                    <p className="type meta-status">{` ${result.status}`}</p>
                    {props.auditIndicators(result.audit, result['@id'], { session: reactContext.session, search: true })}
                </div>
                <div className="accession"><a href={result['@id']}>{result.category} &mdash; {result.purpose} &mdash; {result.method}</a></div>
                <div className="data-row">
                    {result.modified_site_by_target_id ? <div><strong>Target: </strong>{result.modified_site_by_target_id.name}</div> : null}
                    {result.lab ? <div><strong>Lab: </strong>{result.lab.title}</div> : null}
                </div>
            </div>
            {props.auditDetail(result.audit, result['@id'], { session: reactContext.session, except: result['@id'], forcedEditLink: true })}
        </li>
    );
};

ListingComponent.propTypes = {
    context: PropTypes.object.isRequired, // Search results object
    auditDetail: PropTypes.func.isRequired, // Audit HOC function to show audit details
    auditIndicators: PropTypes.func.isRequired, // Audit HOC function to display audit indicators
};

ListingComponent.contextTypes = {
    session: PropTypes.object, // Login information from <App>
};

const Listing = auditDecor(ListingComponent);

globals.listingViews.register(Listing, 'GeneticModification');


// Display a table of genetic modifications.
export const GeneticModificationSummary = (props) => {
    const { geneticModifications } = props;

    return (
        <SortTablePanel title="Genetic modifications">
            <SortTable list={geneticModifications} columns={GeneticModificationSummary.columns} />
        </SortTablePanel>
    );
};

GeneticModificationSummary.propTypes = {
    geneticModifications: PropTypes.array, // Array of genetic modifications to display
};

GeneticModificationSummary.columns = {
    accession: {
        title: 'Accession',
        display: item => <a href={item['@id']}>{item.accession}</a>,
    },
    category: { title: 'Category' },
    purpose: { title: 'Purpose' },
    method: { title: 'Method' },
    site: {
        title: 'Site',
        display: item => <ModificationSiteItems geneticModification={item} itemClass={'gm-table-modification-site'} />,
    },
};


// The next few components override parts of the standard documents panel for genetic modification
// characterizations. GM characterizations are attachments and not actual document objects, so the
// default document display components have to be overridden with these. See globals.js for a
// summary of the different document panel components.

const EXCERPT_LENGTH = 80; // Maximum number of characters in an excerpt

const CharacterizationHeader = props => (
    <div className="document__header">
        {props.doc.characterization_method}
    </div>
);

CharacterizationHeader.propTypes = {
    doc: PropTypes.object.isRequired, // Characterization object to render
};


const CharacterizationCaption = (props) => {
    const doc = props.doc;
    const caption = doc.caption;
    let excerpt;

    if (caption && caption.length > EXCERPT_LENGTH) {
        excerpt = globals.truncateString(caption, EXCERPT_LENGTH);
    }

    return (
        <div className="document__caption">
            {excerpt || caption ?
                <div data-test="caption">
                    <strong>{excerpt ? 'Caption excerpt: ' : 'Caption: '}</strong>
                    {excerpt ? <span>{excerpt}</span> : <span>{caption}</span>}
                </div>
            : <em>No caption</em>}
        </div>
    );
};

CharacterizationCaption.propTypes = {
    doc: PropTypes.object.isRequired, // Document object to render
};


const CharacterizationDocuments = (props) => {
    const docs = props.docs.filter(doc => !!doc);
    return (
        <dd>
            {docs.map((doc, i) => {
                if (doc && doc.attachment) {
                    const attachmentHref = url.resolve(doc['@id'], doc.attachment.href);
                    const docName = (doc.aliases && doc.aliases.length) ? doc.aliases[0] :
                        ((doc.attachment && doc.attachment.download) ? doc.attachment.download : '');
                    return (
                        <div className="multi-dd dl-link" key={doc['@id']}>
                            <i className="icon icon-download" />&nbsp;
                            <a data-bypass="true" href={attachmentHref} download={doc.attachment.download}>
                                {docName}
                            </a>
                        </div>
                    );
                }
                return <div className="multi-dd dl-link" key={doc['@id']} />;
            })}
        </dd>
    );
};

CharacterizationDocuments.propTypes = {
    docs: PropTypes.array.isRequired,
};


const CharacterizationDetail = (props) => {
    const doc = props.doc;
    const keyClass = `document__detail${props.detailOpen ? ' active' : ''}`;
    const excerpt = doc.description && doc.description.length > EXCERPT_LENGTH;

    return (
        <div className={keyClass}>
            <dl className="key-value-doc" id={`panel${props.id}`} aria-labelledby={`tab${props.id}`} role="tabpanel">
                {excerpt ?
                    <div data-test="caption">
                        <dt>Caption</dt>
                        <dd>{doc.caption}</dd>
                    </div>
                : null}

                {doc.submitted_by && doc.submitted_by.title ?
                    <div data-test="submitted-by">
                        <dt>Submitted by</dt>
                        <dd>{doc.submitted_by.title}</dd>
                    </div>
                : null}

                <div data-test="lab">
                    <dt>Lab</dt>
                    <dd>{doc.lab.title}</dd>
                </div>

                {doc.award && doc.award.name ?
                    <div data-test="award">
                        <dt>Grant</dt>
                        <dd><a href={doc.award['@id']}>{doc.award.name}</a></dd>
                    </div>
                : null}

                {doc.submitter_comment ?
                    <div data-test="submittercomment">
                        <dt>Submitter comment</dt>
                        <dd>{doc.submitter_comment}</dd>
                    </div>
                : null}

                {doc.documents && doc.documents.length ?
                    <div data-test="documents">
                        <dt>Documents</dt>
                        <CharacterizationDocuments docs={doc.documents} />
                    </div>
                : null}
            </dl>
        </div>
    );
};

CharacterizationDetail.propTypes = {
    doc: PropTypes.object.isRequired, // Document object to render
    id: PropTypes.string.isRequired, // Unique ID string for the detail panel
    detailOpen: PropTypes.bool, // True if detail panel is visible
};

CharacterizationDetail.defaultProps = {
    detailOpen: false,
};


// Parts of individual genetic modification characterization panels override default parts.
globals.panelViews.register(Document, 'GeneticModificationCharacterization');
globals.documentViews.header.register(CharacterizationHeader, 'GeneticModificationCharacterization');
globals.documentViews.caption.register(CharacterizationCaption, 'GeneticModificationCharacterization');
globals.documentViews.preview.register(DocumentPreview, 'GeneticModificationCharacterization');
globals.documentViews.file.register(DocumentFile, 'GeneticModificationCharacterization');
globals.documentViews.detail.register(CharacterizationDetail, 'GeneticModificationCharacterization');
