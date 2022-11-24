/**
 * @fileoverview Twitter Search Extension
 * @copyright Shingo OKAWA 2022
 */

/*
 * Utility functions and classes.
 */
class Node {
  constructor(value) {
    this.value = value;
    this.children = {};
    this.isSentinel = false;
  }
}

const walk = (node, word, acc) => {
  if (node.isSentinel) acc.push(word);
  for (const k in node.children) walk(node.children[k], word + node.children[k].value, acc);
};

class Trie {
  constructor() {
    this.root = new Node(null);
  }

  add(word) {
    let curr = this.root;
    for (const c of word) {
      if (curr.children[c] === undefined) curr.children[c] = new Node(c);
      curr = curr.children[c];
    }
    curr.isSentinel = true;
  }

  match(word) {
    let curr = this.root;
    for (const c of word) {
      if (curr.children[c] === undefined) return false;
      curr = curr.children[c];
    }
    return curr.isSentinel;
  }

  suggest(prefix) {
    const ret = [];
    if (!prefix) return ret;

    let curr = this.root;
    for (const c of prefix) {
      if (curr.children[c] === undefined) return ret;
      curr = curr.children[c];
    }

    walk(curr, prefix, ret);
    return ret;
  }
}

const getCookieByKey = (key) => {
  const cookie = {};
  decodeURIComponent(document.cookie).split(/\s*;\s*/).map((entry) => {
    const [k, v] = entry.split(/\s*=\s*/);
    cookie[k] = v;
  });
  if (cookie[key] === undefined) return '';
  return cookie[key]
};

const getTypeAheadUsers = async (handleName) => {
  return new Promise((resolve, reject) => {
    const isLoggedIn = !!getCookieByKey('auth_token');
    const csrfToken = getCookieByKey('ct0');
    const guestToken = getCookieByKey('gt');
    const authorization = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

    const url = new URL('https://twitter.com/i/api/1.1/search/typeahead.json');
    url.searchParams.set('include_ext_is_blue_verified', 1);
    url.searchParams.set('q', `@${handleName}`);
    url.searchParams.set('src', 'search_box');
    url.searchParams.set('result_type', 'users');

    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', url.toString(), false);
    xmlHttp.setRequestHeader('x-csrf-token', csrfToken);
    xmlHttp.setRequestHeader('x-twitter-active-user', 'yes');
    if (isLoggedIn) {
      xmlHttp.setRequestHeader('x-twitter-auth-type', 'OAuth2Session');
    } else {
      xmlHttp.setRequestHeader('x-guest-token', guestToken);
    }
    xmlHttp.setRequestHeader('x-twitter-client-language', 'en');
    xmlHttp.setRequestHeader('authorization', `Bearer ${authorization}`);

    xmlHttp.onload = (e) => {
      if (xmlHttp.readyState === 4) {
        if (xmlHttp.status === 200) {
          resolve(xmlHttp.responseText);
        } else {
          reject(xmlHttp.statusText);
        }
      }
    };
    xmlHttp.onerror = (e) => {
      reject(xmlHttp.statusTexT);
    };

    xmlHttp.send(null);
  });
};

const getTypeAheadTopics = async (topic) => {
  return new Promise((resolve, reject) => {
    const isLoggedIn = !!getCookieByKey('auth_token');
    const csrfToken = getCookieByKey('ct0');
    const guestToken = getCookieByKey('gt');
    const authorization = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

    const url = new URL('https://twitter.com/i/api/1.1/search/typeahead.json');
    url.searchParams.set('include_ext_is_blue_verified', 1);
    url.searchParams.set('q', `${topic}`);
    url.searchParams.set('src', 'search_box');
    url.searchParams.set('result_type', 'topics');

    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', url.toString(), false);
    xmlHttp.setRequestHeader('x-csrf-token', csrfToken);
    xmlHttp.setRequestHeader('x-twitter-active-user', 'yes');
    if (isLoggedIn) {
      xmlHttp.setRequestHeader('x-twitter-auth-type', 'OAuth2Session');
    } else {
      xmlHttp.setRequestHeader('x-guest-token', guestToken);
    }
    xmlHttp.setRequestHeader('x-twitter-client-language', 'en');
    xmlHttp.setRequestHeader('authorization', `Bearer ${authorization}`);

    xmlHttp.onload = (e) => {
      if (xmlHttp.readyState === 4) {
        if (xmlHttp.status === 200) {
          resolve(xmlHttp.responseText);
        } else {
          reject(xmlHttp.statusText);
        }
      }
    };
    xmlHttp.onerror = (e) => {
      reject(xmlHttp.statusTexT);
    };

    xmlHttp.send(null);
  });
};

const addCSS = () => {
  const style = document.createElement('style');

  style.appendChild(document.createTextNode(`
    .suggested-query {
      display: inline-flex;
      align-items: center;
      padding: 12px;
      position: absolute;
      color: gray;
      z-index: -1;
      line-height: 18px;
    }
    .suggested-users {
      width: 100%;
      display: flex;
      flex-direction: row;
      cursor: pointer;
      box-sizing: border-box;
      padding: 12px 16px;
      font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 20px;
    }
    .suggested-users:hover {
      background-color: rgb(247,249,249);
    }
    .suggested-users.text-container {
      cursor:default;
      background-color: transparent;
      color: rgb(83, 100, 113);
      text-align: center;
      width: 100%;
      justify-content: center;
    }
    .suggested-users.selected {
      background-color: rgb(247,249,249);
    }
    .avatar {
      border-radius: 1000px;
      height: 56px;
      width: 56px;
      margin-right: 12px;
    }
    .name {
      color: rgb(15,20,25);
      font-weight: 700;
    }
    .handle {
      color: rgb(83,100,113);
    }
    .bio {
      max-lines: 1;
      color: rgb(83,100,113);
      text-overflow: ellipsis;
    }
  `));

  (document.head || document.getElementsByTagName('head')[0]).appendChild(style);
};


/*
 * Constants and variables.
 */
const ADVANCED_QUERIES = new Trie();
ADVANCED_QUERIES.add('from:');

let CURRENT_QUERY = '';

let TIMEOUT = undefined;

let SELECTED_HANDLE_NAME = '';

let SUGGESTIONS = [];

let SUGGESTION_STYLE = undefined;

let IS_ADVANCED_MODE = false;


/*
 * Event handlers.
 */
const showAdvancedQuery = (target) => {
  document.querySelectorAll('.suggested-query').forEach((e) => { e.remove() });

  const start = target.selectionStart;
  const seg = target.value.slice(0, start);
  const match = (seg.match(/\S+$/) || [])[0];
  if (!match) return;

  const suggestions = ADVANCED_QUERIES.suggest(match);
  if (suggestions.length !== 1) return;

  const span = document.createElement('span');
  const newSeg = seg.replace(/\S+$/, suggestions[0]);
  span.classList.add('suggested-query');
  span.innerText = newSeg + target.value.slice(start);

  target.parentElement.prepend(span);
};

const setAdvancedQuery = (value) => {
  const search = document.querySelector('[data-testid=SearchBox_Search_Input]');
  IS_ADVANCED_MODE = true;
  search.focus();
  let p = document.createElement('p');
  p.style.color = 'white';
  p.style.background = 'gray';
  p.style.padding = '5px';
  p.style.marginRight = '5px';
  p.style.marginLeft = '5px';
  p.style.opacity = '0.5';
  p.style.borderRadius = '5px';
  p.innerHTML = `${CURRENT_QUERY}${value}`;
  search.parentElement.prepend(p);
  setTimeout(() => {
    document.querySelector('[data-testid=clearButton]').click();
    showNative();
  });
};

const showText = (text, handleClick) => {
  document.querySelectorAll('.suggested-users').forEach((e) => e.remove());

  const dropdown = document.querySelector('div[id^=typeaheadDropdown-]');
  const container = document.createElement('div');
  container.classList.add('suggested-users');

  if (handleClick) container.addEventListener('mousedown', handleClick);
  else container.classList.add('text-container');

  const div = document.createElement('div');
  container.classList.add('text');
  div.appendChild(document.createTextNode(text));
  container.appendChild(div);
  dropdown.appendChild(container);
};

const showUsers = (suggestions) => {
  document.querySelectorAll('.suggested-users').forEach((e) => e.remove());

  const dropdown = document.querySelector('div[id^=typeaheadDropdown-]');

  suggestions.forEach((suggestion) => {
    const container = document.createElement('div');
    container.classList.add('suggested-users');
    if (suggestion.handleName === SELECTED_HANDLE_NAME) container.classList.add('selected');

    const avatar = document.createElement('img');
    avatar.classList.add('avatar');
    avatar.setAttribute('src', suggestion.avatarUrl);
    container.appendChild(avatar);

    const textContainer = document.createElement('div');
    textContainer.classList.add('text-container');

    const name = document.createElement('div');
    name.classList.add('name');
    name.appendChild(document.createTextNode(suggestion.name));
    textContainer.appendChild(name);

    const handleName = document.createElement('div');
    handleName.classList.add('handle');
    handleName.appendChild(document.createTextNode('@' + suggestion.handleName));
    textContainer.appendChild(handleName);

    const bio = document.createElement('div');
    bio.classList.add('bio');
    bio.appendChild(document.createTextNode(suggestion.bio));
    textContainer.appendChild(bio);

    container.appendChild(textContainer);
    container.addEventListener('click', () => {
      setAdvancedQuery(suggestion.handleName);
    });

    dropdown.appendChild(container);
  });
};

const showTopics = (topics) => {
  document.querySelectorAll('.suggested-users').forEach((e) => e.remove());

  const dropdown = document.querySelector('div[id^=typeaheadDropdown-]');

  const xmlns = 'http://www.w3.org/2000/svg';

  topics.forEach((topic) => {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.paddingBottom = '12px';
    container.style.paddingTop = '12px';
    container.style.paddingLeft = '16px';
    container.style.paddingRight = '16px';
    container.classList.add('suggested-topics');

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.width = '56px';
    div.style.height = '56px';
    div.style.marginRight = '12px';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    container.appendChild(div);

    const svg = document.createElementNS(xmlns, 'svg');
    svg.setAttribute('viewBox', '0 0 21 21');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.width = '28px';
    svg.style.height = '28px';
    div.appendChild(svg);

    const g = document.createElementNS(xmlns, 'g');
    svg.appendChild(g);

    const path = document.createElementNS(xmlns, 'path');
    path.setAttributeNS(null, 'd', 'M9.094 3.095c-3.314 0-6 2.686-6 6s2.686 6 6 6c1.657 0 3.155-.67 4.243-1.757 1.087-1.088 1.757-2.586 1.757-4.243 0-3.314-2.686-6-6-6zm-9 6c0-4.971 4.029-9 9-9s9 4.029 9 9c0 1.943-.617 3.744-1.664 5.215l4.475 4.474-2.122 2.122-4.474-4.475c-1.471 1.047-3.272 1.664-5.215 1.664-4.97-.001-8.999-4.03-9-9z');
    g.appendChild(path);

    const textContainer = document.createElement('div');
    textContainer.classList.add('text-container');

    const name = document.createElement('div');
    name.classList.add('name');
    name.appendChild(document.createTextNode(topic.topic));
    textContainer.appendChild(name);

    container.appendChild(textContainer);
//    container.addEventListener('click', () => {
//      setAdvancedQuery(suggestion.handleName);
//    });

    dropdown.appendChild(container);
  });
};

const showNative = () => {
  document.querySelectorAll('.suggested-users').forEach((e) => e.remove());
  if (SUGGESTION_STYLE) {
    SUGGESTION_STYLE.remove()
    SUGGESTION_STYLE = undefined;
  };
  SUGGESTIONS = [];
};

const hideNative = () => {
  if (!SUGGESTION_STYLE) {
    const head = document.head || document.getElementsByTagName('head')[0];
    SUGGESTION_STYLE = document.createElement('style');
    head.appendChild(SUGGESTION_STYLE);
    SUGGESTION_STYLE.appendChild(document.createTextNode(`
      div[data-testid="typeaheadResult"] {
        display: none !important;
      };
    `));
  };
};

const handleChange = (event) => {
  const text = event.target.value;
  showNative();

  if (IS_ADVANCED_MODE) {
    hideNative();
    if (text === '') {
      //showAdvancedText('Type a topic');
    } else {
      if (TIMEOUT) clearTimeout(TIMEOUT);
      TIMEOUT = setTimeout(() => {
        getTypeAheadTopics(text).then((resp) => {
          const json = JSON.parse(resp);
          console.log(json);
          if (json.topics.length == 0) {
            //showAdvancedText('No topics found')
          } else {
            showTopics(json.topics);
          }
        });
      }, 200);
    }
    return;
  }

  showAdvancedQuery(event.target);
  const match = (text.match(/^(from:)([^ ]*)$/) || []);
  if (!match[0]) {
    CURRENT_QUERY = '';
    return;
  }

  hideNative();
  CURRENT_QUERY = match[1];
  const handleName = match[2];
  if (handleName === '') {
    showText('Type a user name');
  } else {
    if (TIMEOUT) clearTimeout(TIMEOUT);
    TIMEOUT = setTimeout(() => {
      getTypeAheadUsers(handleName).then((resp) => {
        const json = JSON.parse(resp);
        if (!json.users.length) {
          showText('No users found')
        } else {
          SUGGESTIONS = json.users.map((user) => {
            return {
              avatarUrl: user.profile_image_url_https,
              name: user.name,
              handleName: user.screen_name,
              bio: user.result_context.display_string || '',
              isBlueTick: user.verified || user.ext_is_blue_verified,
          }});
          showUsers(SUGGESTIONS);
        }
      });
    }, 200);
  }
};

const handleKeyDown = (event) => {
  const search = document.querySelector('[data-testid=SearchBox_Search_Input]');
  const suggestions = ADVANCED_QUERIES.suggest(event.target.value);
  if (SUGGESTIONS.length) {
    if (event.keyCode == '38') { // up
      let newIndex = SUGGESTIONS.length - 1;
      const selectedIndex = SUGGESTIONS.findIndex((s) => s.handleName === SELECTED_HANDLE_NAME);
      if (selectedIndex > 0) newIndex = selectedIndex - 1;
      SELECTED_HANDLE_NAME = SUGGESTIONS[newIndex].handleName;
      showUsers(SUGGESTIONS);
    } else if (event.keyCode == '40') { // down
      let newIndex = 0;
      const selectedIndex = SUGGESTIONS.findIndex((s) => s.handleName === SELECTED_HANDLE_NAME);
      if (selectedIndex < SUGGESTIONS.length - 1) newIndex = selectedIndex + 1;
      SELECTED_HANDLE_NAME = SUGGESTIONS[newIndex].handleName;
      showUsers(SUGGESTIONS);
    } else if (event.keyCode == '13' && SELECTED_HANDLE_NAME) { // enter
      event.preventDefault();
      event.stopPropagation();
      setAdvancedQuery(SELECTED_HANDLE_NAME);
      SELECTED_HANDLE_NAME = '';
      SUGGESTIONS = [];
    }
  } else {
    if ( // backspace
      event.keyCode == '8' &&
      search.parentElement.children.length >= 2 &&
      [" ", ""].includes(event.target.value)
    ) {
      search.parentElement.children[search.parentElement.children.length - 2].remove();
      if (search.parentElement.children.length === 1) IS_ADVANCED_MODE = false;
      showNative();
    } else if ( // tab
      event.keyCode == '9' &&
      suggestions.length === 1
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.target.value = suggestions[0];
      hideNative();
      showText('Type a user name');
    }
  }
};


/*
 * The entry point.
 */
(function() {
  'use strict';
  addCSS();
  const search = document.querySelector('[data-testid=SearchBox_Search_Input]');
  search.addEventListener('input', handleChange);
  search.addEventListener('change', handleChange);
  search.addEventListener('keydown', handleKeyDown);
})();
