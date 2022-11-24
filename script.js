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

const createObserver = (handleAdded, handleRemoved) => {
  return new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.querySelector) {
          const search = node.querySelector('input[data-testid="SearchBox_Search_Input"]');
          if (!!search) handleAdded(search);
        }
      });
      mutation.removedNodes.forEach((node) => {
        if (node.querySelector) {
          const search = node.querySelector('input[data-testid="SearchBox_Search_Input"]');
          if (!!search) handleRemoved(search);
        }
      });
    });
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

//
let TIMEOUT = undefined;

//
let SELECTED_HANDLE_NAME = '';

//
let SUGGESTIONS = [];

//
let SUGGESTION_STYLE = undefined;


/*
 * Event handlers.
 */
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
//    container.addEventListener('click', () => setInputText(`from:${s.twitterHandle} `));

    dropdown.appendChild(container);
  });
};

const showNative = () => {
  document.querySelectorAll('.suggested-users').forEach((e) => e.remove());
  if (SUGGESTION_STYLE) {
    SUGGESTION_STYLE.remove()
    SUGGESTION_STYLE = undefined;
  };
};

const hideNative = () => {
  if(!SUGGESTION_STYLE) {
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

const handleChange = (event) => {
  showAdvancedQuery(event.target);
  showNative();

  const text = event.target.value;
  const match = (text.match(/^(from:)([^ ]*)$/) || []);
  if (!match[0]) {
    return;
  }

  hideNative();
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
            console.log(user);
            return {
              avatarUrl: user.profile_image_url_https,
              name: user.name,
              handleName: user.screen_name,
              bio: user.result_context.display_string || '',
              isBlueTick: user.verified || user.ext_is_blue_verified,
          }});
          showUsers(SUGGESTIONS);
        };
      });
    }, 200);
  }
};

const handleKeyDown = (e) => {
  if (SUGGESTIONS.length) {
    if (e.keyCode === '38') { // up
      let newIndex = SUGGESTIONS.length - 1;
      const selectedIndex = SUGGESTIONS.findIndex((s) => s.handleName === SELECTED_HANDLE_NAME);
      if (selectedIndex > 0) newIndex = selectedIndex - 1;
      SELECTED_HANDLE_NAME = SUGGESTIONS[newIndex].handleName;
      showUsers(SUGGESTIONS);
    } else if (e.keyCode == '40') { // down
      let newIndex = 0;
      const selectedIndex = SUGGESTIONS.findIndex((s) => s.handleName === SELECTED_HANDLE_NAME);
      if (selectedIndex < SUGGESTIONS.length - 1) newIndex = selectedIndex + 1;
      SELECTED_HANDLE_NAME = SUGGESTIONS[newIndex].handleName;
      showUsers(SUGGESTIONS);
    } else if (e.keyCode == '13' && SELECTED_HANDLE_NAME) { //enter
      e.preventDefault();
      e.stopPropagation();
      //setInputText(`from:${selectedHandle} `);
      SELECTED_HANDLE_NAME = '';
      SUGGESTIONS = [];
    }
  }
};


/*
 * The entry point.
 */
(function() {
  'use strict';
  addCSS();

  const search = document.querySelectorAll('[data-testid=SearchBox_Search_Input]')[0];
//  const handleAdded = (elem) => {
    search.addEventListener('input', handleChange);
    search.addEventListener('change', handleChange);
    search.addEventListener('keydown', handleKeyDown);
//  };

//  const handleRemoved = (elem) => {
//    searchEl.removeEventListener('input', onSearchChange);
//    elem.removeEventListener('change', handleChange);
//  };

//  const observer = createObserver(handleAdded, handleRemoved);
//  observer.observe(document.querySelector("#react-root"), { subtree: true, childList: true });
})();
