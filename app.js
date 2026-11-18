'use strict';

const subjects = {
  'lc-maths': 'Leaving Cert Maths',
  'jc-maths': 'Junior Cert / Cycle Maths',
  'inter-maths': 'Intermediate Cert Maths',
  'jc-science': 'Junior Cert / Cycle Science',
  'lc-computing': 'Leaving Cert Computer Science',
  'lc-applied': 'Leaving Cert Applied Maths',
  'lc-physics': 'Leaving Cert Physics'
};
const courseTopics = {
  first: ['Natural Numbers', 'Integers', 'Rational Numbers', 'Decimals and Percentages', 'Sets'],
  second: ['Sets', 'Basic Geometry', 'Algebra', 'Applied Arithmetic', 'Distance, Speed, Time and Real-Life Graphs']
};
const $ = id => document.getElementById(id);
const subject = $('subject');
const level = $('level');
const year = $('year');
const course = $('course');
const topicLevel = $('topic-level');
const topic = $('topic');
const preview = $('preview');
let layout = 'covers';
let limit = 6;

function options(select, pairs, preferred) {
  select.replaceChildren(...pairs.map(([value, label]) => new Option(label, value)));
  if (pairs.some(([value]) => value === preferred)) select.value = preferred;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, url) {
  const anchor = element('a', text, 'doc-link');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  return anchor;
}

function sourceFor(subjectId, examYear, examLevel, paper, kind) {
  const documents = (catalog.subjects[subjectId] || []).filter(([y, l, label, type]) =>
    y === examYear && l === examLevel && type === kind && !label.includes('deferred'));
  const target = paper === 'Single paper' ? 'Paper' : paper;
  return documents.find(([, , label]) => label.endsWith(target)) ||
    (kind === 'scheme' && documents.find(([, , label]) => label === 'Marking scheme'));
}

function filteredDocuments() {
  return catalog.subjects[subject.value].filter(([, l]) => level.value === 'all' || l === level.value);
}

function filterYears() {
  const years = [...new Set(filteredDocuments().map(row => row[0]))];
  options(year, [['all', 'All years'], ...years.map(y => [String(y), String(y)])], year.value);
}

function changeSubject() {
  const levels = [...new Set(catalog.subjects[subject.value].map(row => row[1]))].sort();
  options(level, [['all', 'All levels'], ...levels.map(l => [l, l])],
    subject.value === 'lc-maths' ? 'Ordinary' : 'all');
  year.value = 'all';
  filterYears();
  renderYears();
}

function openPreview(label, url) {
  $('preview-title').textContent = label;
  $('preview-link').href = url;
  $('preview-pdf').src = url + '#page=1&view=FitH';
  preview.showModal();
}

function renderDocument(row) {
  const [y, l, name, kind, url, source] = row;
  const item = element(layout === 'covers' ? 'article' : 'li', '', layout === 'covers' ? 'cover' : '');
  const title = l === 'Unspecified' ? name : l + ' · ' + name;
  const directPdf = source !== 'Better Exams → SEC';
  const open = link(kind === 'paper' ? 'Open paper' : 'Open marking scheme', url);
  open.setAttribute('aria-label', 'Open ' + y + ' ' + title);
  if (layout === 'covers') {
    const tile = directPdf ? element('button', '', 'cover-preview') : element('div', '', 'cover-preview');
    if (kind === 'scheme') tile.classList.add('scheme');
    tile.append(element('strong', title), element('small', directPdf ? 'Preview first page' : 'Scheme download page'));
    if (directPdf) {
      tile.type = 'button';
      tile.onclick = () => openPreview(y + ' · ' + title, url);
    }
    item.append(tile, element('p', source, 'doc-meta'), open);
  } else {
    item.append(element('span', title), open);
  }
  return item;
}

function renderYears() {
  const rows = filteredDocuments().filter(([y, , , kind]) =>
    (year.value === 'all' || Number(year.value) === y) &&
    ($('material').value === 'all' || $('material').value === kind));
  const years = Map.groupBy(rows, row => row[0]);
  const notes = {
    'lc-maths': 'The 2020 papers were sat in November. Deferred sessions are labelled where included.',
    'jc-maths': 'Recent years list one Ordinary and one Higher Level paper. Earlier years can have Paper 1 and Paper 2 at both levels.',
    'inter-maths': 'Historical papers from before the Junior Certificate, including arithmetic papers where available.'
  };
  $('year-title').textContent = subjects[subject.value];
  $('year-note').textContent = notes[subject.value] || '';
  $('year-count').textContent = rows.length
    ? rows.length + ' documents across ' + years.size + ' years'
    : 'No documents match these filters. Try another year or material.';
  $('years').replaceChildren(...[...years].slice(0, limit).map(([y, documents]) => {
    const group = element('section', '', 'year-group');
    const results = element(layout === 'covers' ? 'div' : 'ul', '', layout === 'covers' ? 'cover-grid' : 'doc-list');
    results.append(...documents.map(renderDocument));
    group.append(element('h3', String(y)), results);
    return group;
  }));
  $('older').hidden = years.size <= limit;
}

function topicRows() {
  const current = course.value;
  return catalog.topics.filter(row => {
    if (courseTopics[current]) return row[0] === 'jc-maths' && courseTopics[current].includes(row[5]);
    return row[0] === current;
  });
}

function refreshTopics() {
  const current = course.value;
  const levels = current === 'lc-maths' ? [['Ordinary', 'Ordinary']] :
    [['all', 'Both levels'], ['Ordinary', 'Ordinary'], ['Higher', 'Higher']];
  options(topicLevel, levels, topicLevel.value);
  const names = courseTopics[current] || [...new Set(topicRows().map(row => row[5]))].sort();
  options(topic, [['all', 'All topics'], ...names.map(name => [name, name])], topic.value);
  renderTopics();
}

function renderTopics() {
  const items = topicRows().filter(row =>
    (topicLevel.value === 'all' || topicLevel.value === row[2]) &&
    (topic.value === 'all' || topic.value === row[5])).sort((a, b) => b[1] - a[1]);
  $('topic-title').textContent = course.selectedOptions[0].textContent + ' by topic';
  $('topic-note').textContent = courseTopics[course.value]
    ? 'Topic names follow the class scheme of work. Levels refer to the source Junior Cycle exam.'
    : 'Choose a topic, attempt a question, then check the official marking scheme where available.';
  $('topic-count').textContent = items.length ? items.length + ' question references' : 'This topic has no indexed questions for the selected level yet.';
  $('questions').replaceChildren(...items.map(([s, y, l, paper, number, name, detail, page, fallback, schemePage]) => {
    const card = element('article', '', 'question');
    const original = sourceFor(s, y, l, paper, 'paper');
    const scheme = sourceFor(s, y, l, paper, 'scheme');
    const reference = paper === 'Single paper' ? number : paper + ' · ' + number;
    card.append(element('p', y + ' · ' + l + ' · ' + reference, 'doc-meta'),
      element('h3', name), element('p', detail));
    const url = original ? original[4] + (page ? '#page=' + page : '') : fallback;
    if (url) card.append(link(page ? 'Open question page' : 'Open paper', url));
    if (scheme) card.append(link(schemePage ? 'Open marking page' : 'Marking scheme',
      scheme[4] + (schemePage ? '#page=' + schemePage : '')));
    return card;
  }));
}

document.querySelectorAll('[data-mode]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-mode]').forEach(candidate =>
      candidate.setAttribute('aria-pressed', String(candidate === button)));
    $('year-view').hidden = button.dataset.mode !== 'year';
    $('topic-view').hidden = button.dataset.mode !== 'topic';
  };
});
document.querySelectorAll('[data-layout]').forEach(button => {
  button.onclick = () => {
    layout = button.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach(candidate =>
      candidate.setAttribute('aria-pressed', String(candidate === button)));
    renderYears();
  };
});
subject.onchange = () => { limit = 6; changeSubject(); };
level.onchange = () => { limit = 6; filterYears(); renderYears(); };
year.onchange = $('material').onchange = () => { limit = 6; renderYears(); };
$('older').onclick = () => {
  const firstNew = $('years').children.length;
  limit += 12;
  renderYears();
  const heading = $('years').children[firstNew]?.querySelector('h3');
  if (heading) { heading.tabIndex = -1; heading.focus(); }
};
course.onchange = () => { topic.value = 'all'; refreshTopics(); };
topic.onchange = topicLevel.onchange = renderTopics;
$('close-preview').onclick = () => preview.close();
preview.addEventListener('close', () => $('preview-pdf').removeAttribute('src'));
options(subject, Object.entries(subjects), 'lc-maths');
changeSubject();
refreshTopics();
