// Some parts of this code are unshamely copied from
// https://framagit.org/framasoft/fun/proutify/
// and are so under MPL 2.0

// throttling global variables
let replaceWait = false;
let replaceWaitTime = 250; // quarter of a second
let replaceQueue = [];

// List of strings to proutify
txts = [
 ["([^ ]+)[\.·-]te[\.·-]s", ["tes", "s"]],
 ["([^ ]+)[\.·-]x[\.·-]es", ["ses", "x"]],
 ["([^ ]+)[\.·-]e[\.·-]s", ["es", "s"]]
 
]

// Join prouts in a regex
let regexString = "";
for (let i in txts) {
  regexString += txts[i][0] + '|';
}
console.log(regexString);
regexString = regexString.slice(0, -1); // Remove trailing pipe

const regex = new RegExp(regexString, "gi");

// Use case insensitive replacer
const replacer = (match, ...rest) => {
	for(let i in rest) {
    if (rest[i]) {
      prefix = rest[i];
      regles = txts[i][1];
      break;
    }
   }

return prefix + regles[0] + " et " + prefix + regles[1];
	
};

function processQueue() {
  // clone queue
  let queue = replaceQueue.slice(0);
  // empty queue
  replaceQueue = [];
  // loop through clone
  queue.forEach( (mutations) => {
      replaceNodes(mutations);
  });
}

function setWait() {
  replaceWait = true;
  setTimeout(function () {
      replaceWait = false;
      timerCallback();
  }, replaceWaitTime);
}

function timerCallback() {
  if(replaceQueue.length > 0) {
      // if there are queued items, process them
      processQueue();
      // then set wait to do next batch
      setWait();
  } else {
      // if the queue has been empty for a full timer cycle
      // remove the wait time to process the next action
      replaceWait = false;
  }
}

// The callback used for the document body and title observers
function observerCallback(mutations) {
    // add to queue
    replaceQueue.push(mutations);
    if(!replaceWait) {
        processQueue();
        setWait();
    } // else the queue will be processed when the timer finishes
}

const replaceText = (v) => {
  v = v.replace(regex, replacer)
  return v
}
const handleText = (textNode) => {
    textNode.nodeValue = replaceText(textNode.nodeValue);
}

// Returns true if a node should *not* be altered in any way
const forbiddenTagNames = ['textarea', 'input', 'script', 'noscript', 'template', 'style'];
function isForbiddenNode(node) {
    if (node.isContentEditable) {
        return true;
    } else if (node.parentNode && node.parentNode.isContentEditable) {
        return true;
    } else {
        return forbiddenTagNames.includes(node.tagName?.toLowerCase());
    }
}

// The callback used for the document body and head observers
const replaceNodes = (mutations) => {
  let i, node;

  mutations.forEach(function(mutation) {
      for (i = 0; i < mutation.addedNodes.length; i++) {
          node = mutation.addedNodes[i];
          if (isForbiddenNode(node)) {
              // Should never operate on user-editable content
              continue;
          } else if (node.nodeType === 3) {
              // Replace the text for text nodes
              handleText(node);
          } else {
              // Otherwise, find text nodes within the given node and replace text
              walk(node);
          }
      }
  });
}

const walk = (rootNode) => {
  // Find all the text nodes in rootNode
  let walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
          acceptNode: function(node) {
              return /^(STYLE|SCRIPT)$/.test(node.parentElement.tagName) || /^\s*$/.test(node.data) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
          }
      },
      false
  ),
  node;

  // Modify each text node's value
  while (node = walker.nextNode()) {
      handleText(node);
  }
}

// Walk the doc (document) body, replace the title, and observe the body and head
const walkAndObserve = (doc) => {
  let docHead = doc.getElementsByTagName('head')[0]
  let observerConfig = {
      characterData: true,
      childList: true,
      subtree: true
  }
  let bodyObserver
  let headObserver

  // Do the initial text replacements in the document body and title
  walk(doc.body);
  doc.title = replaceText(doc.title);

  // Observe the body so that we replace text in any added/modified nodes
  bodyObserver = new MutationObserver(observerCallback);
  bodyObserver.observe(doc.body, observerConfig);

  // Observe the title so we can handle any modifications there
  if (docHead) {
      headObserver = new MutationObserver(observerCallback);
      headObserver.observe(docHead, observerConfig);
  }
}

walkAndObserve(document)
