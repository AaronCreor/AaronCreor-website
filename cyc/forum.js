'use strict';

const topics = {
  all: { label: 'All discussions', icon: '▤' },
  homes: { label: 'Group homes', icon: '⌂' },
  therapy: { label: 'Therapy', icon: '♡' },
  school: { label: 'School', icon: '✎' },
  moving: { label: 'Moving & leaving', icon: '↗' },
  wins: { label: 'Small wins', icon: '✧' },
  saved: { label: 'Saved', icon: '♧' },
};

const examples = [
  {
    id: 'school-again', topic: 'school', author: 'paperplanet', time: '2 hours ago', score: 24,
    title: 'How do you explain switching schools again?',
    body: 'I’ve moved schools twice this year. When someone asks why I transferred, I freeze. I want to make friends without having to explain all of it. What do you usually say?',
    replies: [
      { author: 'quietkite', body: '“I moved and I’m still settling in” is my go-to. Most people just ask what classes I have next.' },
      { author: 'riverlamp', body: 'I told one friend a little more after a few weeks. It felt easier when I got to pick the time.' },
    ],
  },
  {
    id: 'first-week', topic: 'homes', author: 'riverlamp', time: '5 hours ago', score: 18,
    title: 'What helped you get through your first week in a group home?',
    body: 'It’s my third night and everything still feels unfamiliar. I’m trying to find one thing that makes the room feel a bit like mine. What helped you settle in?',
    replies: [
      { author: 'mapleorbit', body: 'I put the same playlist on while I unpacked. Having one familiar thing in the room helped.' },
      { author: 'sunnyfern', body: 'I asked what usually happens after dinner. Just knowing the routine took some of the pressure off.' },
    ],
  },
  {
    id: 'therapy-words', topic: 'therapy', author: 'quietkite', time: 'Yesterday', score: 31,
    title: 'I tried bringing a note to therapy instead of talking',
    body: 'I can think of what I want to say on the bus, and then I sit down and my mind goes blank. Last time I wrote down two things and handed over the paper. It felt awkward for about ten seconds, then it got a little easier.',
    replies: [
      { author: 'paperplanet', body: 'I like that you only wrote two things. That makes it feel a lot more doable.' },
    ],
  },
  {
    id: 'first-place', topic: 'moving', author: 'mapleorbit', time: 'Yesterday', score: 14,
    title: 'Making a list for my first place',
    body: 'I’m leaving care soon and my list is already full of stuff like a kettle and towels. What’s one boring thing you wish you’d remembered before your first night?',
    replies: [
      { author: 'sunnyfern', body: 'A lamp. I spent the first evening with the big overhead light on and it felt like waiting at the dentist.' },
    ],
  },
  {
    id: 'small-win', topic: 'wins', author: 'sunnyfern', time: '2 days ago', score: 22,
    title: 'I made pancakes for everyone this morning',
    body: 'The first batch was kind of a disaster, but people came into the kitchen and we put music on. It was the first morning in a while where I wanted to stay at the table.',
    replies: [],
  },
];

const ageKey = 'care-circle-age-confirmed';
const activityKey = 'care-circle-demo-activity';
const byId = (id) => document.getElementById(id);
const entry = byId('entry');
const forum = byId('forum');
const ageForm = byId('age-form');
const ageMessage = byId('age-message');
const feed = byId('feed');
const feedHeading = byId('feed-heading');
const search = byId('search');
const sort = byId('sort');
const compose = byId('compose-dialog');
const composeForm = byId('compose-form');
const composeTopic = byId('compose-topic');
const thread = byId('thread-dialog');
const replyForm = byId('reply-form');
const replies = byId('replies');
const dataDialog = byId('data-dialog');
const toast = byId('toast');

let selectedTopic = 'all';
let openPost = null;
let toastTimer;
let activity = readActivity();

function readActivity() {
  const empty = { posts: [], replies: {}, votes: {}, saved: [] };
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(activityKey)) };
  } catch {
    return empty;
  }
}

function saveActivity() {
  try {
    localStorage.setItem(activityKey, JSON.stringify(activity));
    return true;
  } catch {
    return false;
  }
}

function announce(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function showForum(moveFocus) {
  entry.hidden = true;
  forum.hidden = false;
  renderFeed();
  if (moveFocus) byId('welcome-title').focus();
}

function exitForum() {
  try { sessionStorage.removeItem(ageKey); } catch { /* The age check still resets. */ }
  toast.hidden = true;
  forum.hidden = true;
  entry.hidden = false;
  ageForm.reset();
  ageMessage.hidden = true;
  ageForm.elements.eligible[0].focus();
  window.scrollTo(0, 0);
}

function selectTopic(topic) {
  selectedTopic = topic;
  for (const button of byId('topics').children) {
    button.setAttribute('aria-pressed', String(button.dataset.topic === topic));
  }
  renderFeed();
}

function scoreFor(post) {
  return post.score + (activity.votes[post.id] ?? 0);
}

function repliesFor(post) {
  return [...post.replies, ...(activity.replies[post.id] ?? [])];
}

function postMeta(post) {
  return `${post.author} · ${post.time}`;
}

function renderFeed() {
  let posts = [...activity.posts, ...examples];
  const query = search.value.trim().toLowerCase();
  if (selectedTopic === 'saved') {
    posts = posts.filter((post) => activity.saved.includes(post.id));
  } else if (selectedTopic !== 'all') {
    posts = posts.filter((post) => post.topic === selectedTopic);
  }
  if (query) {
    posts = posts.filter((post) => [post.title, post.body, post.author, topics[post.topic].label]
      .some((value) => value.toLowerCase().includes(query)));
  }
  if (sort.value === 'top') posts.sort((first, second) => scoreFor(second) - scoreFor(first));

  feedHeading.textContent = topics[selectedTopic].label;
  byId('feed-status').textContent = `${posts.length} ${posts.length === 1 ? 'discussion' : 'discussions'} shown.`;
  const content = document.createDocumentFragment();
  for (const post of posts) content.append(createPostCard(post));
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    if (query) empty.textContent = 'No discussions match your search. Try a different word.';
    else if (selectedTopic === 'saved') empty.textContent = 'Use Save on any discussion to find it here later.';
    else empty.textContent = 'This topic is quiet. Start a discussion to get it going.';
    content.append(empty);
  }
  feed.replaceChildren(content);
}

function createPostCard(post) {
  const card = byId('post-template').content.firstElementChild.cloneNode(true);
  card.dataset.post = post.id;
  const tag = card.querySelector('.tag');
  tag.dataset.topic = post.topic;
  tag.textContent = topics[post.topic].label;
  card.querySelector('.post-meta').textContent = postMeta(post);
  card.querySelector('.post-title').textContent = post.title;
  card.querySelector('.post-preview').textContent = post.body;
  card.querySelector('.score').textContent = scoreFor(post);
  const replyCount = repliesFor(post).length;
  card.querySelector('.reply-count').textContent = `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
  for (const button of card.querySelectorAll('[data-vote]')) {
    const direction = Number(button.dataset.vote);
    button.setAttribute('aria-pressed', String(activity.votes[post.id] === direction));
    button.addEventListener('click', () => {
      if (activity.votes[post.id] === direction) delete activity.votes[post.id];
      else activity.votes[post.id] = direction;
      if (!saveActivity()) announce('This browser couldn’t save your vote beyond this visit.');
      refreshAndFocus(post.id, `[data-vote="${direction}"]`);
    });
  }
  const save = card.querySelector('[data-save]');
  const saved = activity.saved.includes(post.id);
  save.setAttribute('aria-pressed', String(saved));
  save.addEventListener('click', () => {
    if (saved) activity.saved = activity.saved.filter((id) => id !== post.id);
    else activity.saved.push(post.id);
    const stored = saveActivity();
    announce(stored ? (saved ? 'Removed from Saved.' : 'Added to Saved.') : 'This browser couldn’t save your changes beyond this visit.');
    refreshAndFocus(post.id, '[data-save]');
  });
  for (const button of card.querySelectorAll('[data-thread]')) {
    button.addEventListener('click', () => openThread(post, button));
  }
  return card;
}

function refreshAndFocus(id, selector) {
  renderFeed();
  const card = feed.querySelector(`[data-post="${id}"]`);
  (card?.querySelector(selector) ?? feedHeading).focus({ preventScroll: true });
}

function openThread(post, button) {
  openPost = post;
  byId('thread-topic').textContent = topics[post.topic].label;
  byId('thread-title').textContent = post.title;
  byId('thread-meta').textContent = postMeta(post);
  byId('thread-body').textContent = post.body;
  replyForm.reset();
  renderReplies();
  thread.showModal();
  thread.scrollTop = 0;
  thread.addEventListener('close', () => {
    const selector = button.classList.contains('post-title') ? '.post-title' : '.post-action[data-thread]';
    refreshAndFocus(post.id, selector);
  }, { once: true });
}

function renderReplies() {
  const content = document.createDocumentFragment();
  for (const reply of repliesFor(openPost)) {
    const card = document.createElement('div');
    card.className = 'reply';
    const author = document.createElement('strong');
    author.className = 'post-meta';
    author.textContent = reply.author;
    const body = document.createElement('p');
    body.textContent = reply.body;
    card.append(author, body);
    content.append(card);
  }
  if (!content.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'dialog-note';
    empty.textContent = 'Be the first to reply.';
    content.append(empty);
  }
  replies.replaceChildren(content);
}

function formText(field) {
  const value = field.value.trim();
  if (!value) {
    field.setCustomValidity('Add some text before posting.');
    field.reportValidity();
  }
  return value;
}

for (const [id, topic] of Object.entries(topics)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'topic-button';
  button.dataset.topic = id;
  button.setAttribute('aria-pressed', String(id === selectedTopic));
  const icon = document.createElement('span');
  icon.className = 'topic-symbol';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = topic.icon;
  button.append(icon, topic.label);
  button.addEventListener('click', () => selectTopic(id));
  byId('topics').append(button);
  if (id !== 'all' && id !== 'saved') composeTopic.add(new Option(topic.label, id));
}

ageForm.addEventListener('change', () => { ageMessage.hidden = true; });
ageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (ageForm.elements.eligible.value !== 'yes') {
    ageMessage.hidden = false;
    return;
  }
  try { sessionStorage.setItem(ageKey, 'yes'); } catch { /* Keep confirmation in this page only. */ }
  showForum(true);
});

byId('exit').addEventListener('click', exitForum);
byId('home-button').addEventListener('click', () => {
  search.value = '';
  sort.value = 'latest';
  selectTopic('all');
  window.scrollTo(0, 0);
});
search.addEventListener('input', renderFeed);
sort.addEventListener('change', renderFeed);

for (const button of document.querySelectorAll('[data-compose]')) {
  button.addEventListener('click', () => {
    if (selectedTopic !== 'all' && selectedTopic !== 'saved') composeTopic.value = selectedTopic;
    compose.showModal();
  });
}
for (const button of document.querySelectorAll('[data-guidelines]')) {
  button.addEventListener('click', () => byId('guidelines-dialog').showModal());
}
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}
for (const field of document.querySelectorAll('.stacked-form input, .stacked-form textarea')) {
  field.addEventListener('input', () => field.setCustomValidity(''));
}

composeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = formText(composeForm.elements.title);
  if (!title) return;
  const body = formText(composeForm.elements.body);
  if (!body) return;
  const topic = composeTopic.value;
  const id = `local-${crypto.randomUUID()}`;
  activity.posts.unshift({ id, topic, title, body, author: 'You', time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), score: 0, replies: [] });
  const stored = saveActivity();
  compose.close();
  composeForm.reset();
  search.value = '';
  sort.value = 'latest';
  selectTopic(selectedTopic === 'all' ? 'all' : topic);
  const newPost = feed.querySelector(`[data-post="${id}"] .post-title`);
  newPost.focus();
  announce(stored ? 'Discussion added to this browser.' : 'Discussion added for this visit only.');
});

replyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const field = replyForm.elements.body;
  const body = formText(field);
  if (!body) return;
  (activity.replies[openPost.id] ??= []).push({ author: 'You', body });
  const stored = saveActivity();
  replyForm.reset();
  replyForm.querySelector('.dialog-note').textContent = stored ? 'Reply added in this browser.' : 'Reply added for this visit only.';
  renderReplies();
  field.focus();
});

thread.addEventListener('close', () => {
  replyForm.querySelector('.dialog-note').textContent = 'Replies stay in this browser. Leave out identifying details.';
  replyForm.elements.body.setCustomValidity('');
});

byId('manage-data').addEventListener('click', () => dataDialog.showModal());
byId('clear-data').addEventListener('click', () => {
  try {
    localStorage.removeItem(activityKey);
  } catch {
    dataDialog.close();
    announce('This browser couldn’t clear stored activity.');
    return;
  }
  activity = readActivity();
  dataDialog.close();
  renderFeed();
  announce('Demo activity cleared.');
});

window.addEventListener('storage', (event) => {
  if (event.key !== activityKey && event.key !== null) return;
  activity = readActivity();
  if (!forum.hidden) renderFeed();
  if (thread.open) {
    const refreshedPost = [...activity.posts, ...examples].find((post) => post.id === openPost.id);
    if (refreshedPost) {
      openPost = refreshedPost;
      renderReplies();
    } else thread.close();
  }
});

try {
  if (sessionStorage.getItem(ageKey) === 'yes') showForum(false);
} catch { /* The initial age screen stays visible if storage is unavailable. */ }
