const renderContainer = document.getElementById("render");
const layoutContainer = document.querySelector(".container");
const messageContainer = document.getElementById("message-container");

const saveBtn = document.getElementById("save");
const layoutBtn = document.getElementById("layout");
const colorModeBtn = document.getElementById("colors");
const infoBtn = document.getElementById("info-btn");

// get data from chrome storage
let myGroups = [];
chrome.storage.local.get(null, (result) => {
    if (result.colorMode === "light") toggleDarkMode();
    if (result.layout === "grid") toggleLayout();

    myGroups = result.myGroups || [];
    renderGroups();
});

function renderGroups() {
    let bodyReady = "";
    for (let i = 0; i < myGroups.length; i++) {
        bodyReady += `
            <div class="group-container">
                <button class="button group-color--${ myGroups[i].color }"
                        data-open="${ i }">
                    ${ myGroups[i].title }
                </button>
                
                <div class="group-btn-wrapper">
                    <!-- Add tab to the group Button -->
                    <button class="add-tab-btn" data-add="${ i }" title="Add current tab">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <!-- Deletegroup Button -->
                    <button class="delete-btn" data-delete="${ i }" title="Delete group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `
    }
    renderContainer.innerHTML = bodyReady;
    renderContainer.appendChild(saveBtn);
}

// Group's actions
function handleClick(event) {
    if (event.target.closest("button")?.dataset?.open){
        openGroup(event.target.closest("button")?.dataset?.open);

    } else if (event.target.closest("button")?.dataset?.add){
        addTab(event.target.closest("button")?.dataset?.add);

    } else if (event.target.closest("button")?.dataset?.delete){
        deleteGroup(event.target.closest("button")?.dataset?.delete);
    }
}

function openGroup(index) {
    let group = myGroups[index];
    const tabIds = [];

    for (let i = 0; i < group.tabs.length; i++) {
        chrome.tabs.create({"url": group.tabs[i].url}, function(newTab) {
            tabIds.push(newTab.id);
            if(i === group.tabs.length - 1) groupTabs(tabIds, group.title, group.color);
        });
    }
}

function addTab(groupIndex){
    chrome.tabs.query({active:true}, (tab) => {
        myGroups[groupIndex].tabs.push({
            title: tab[0].title,
            url: tab[0].url
        })
        showMessage("Tab added successfully!");
    });
}

function deleteGroup(groupIndex){
    myGroups.splice(groupIndex, 1);
    storeData();
    renderGroups();
}

function groupTabs(tabId, title, color) {
    chrome.tabs.group({ tabIds: tabId }, function(groupId) {
        chrome.tabGroups.update(groupId, { collapsed: false, title, color });
    });
}

function addGroup() {
    let group = {
        title: "",
        color: "",
        tabs: []
    };

    // get current tab info
    chrome.tabs.query({active:true}, (tab) => {
        let { groupId } = tab[0];
        if (groupId === -1) {
            showMessage("Current tab is not in the group!");
            return;
        }
        // get current groups info
        chrome.tabGroups.get(groupId, (currentGroup) => {
            group.color = currentGroup.color;
            group.title = currentGroup.title;

            // get all grouped tabs' urls
            chrome.tabs.query({ groupId }, (groupTabs)=> {
                for (let i = 0; i < groupTabs.length; i++) {
                    group.tabs.push({
                        title: groupTabs[i].title,
                        url: groupTabs[i].url
                    })
                }
                myGroups.push(group);
                storeData();
                renderGroups();
            });
        });
    });
}

function storeData() {
    chrome.storage.local.set({ myGroups });
}

// other functions
function toggleLayout() {
    layoutContainer.classList.toggle("list");
    layoutContainer.classList.toggle("grid");

    let layout = layoutContainer.classList.contains("list") ? "list" : "grid";
    chrome.storage.local.set({ layout });
}

function toggleDarkMode() {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");

    let colorMode =  document.body.classList.contains("dark") ? "dark" : "light";
    chrome.storage.local.set({ colorMode });
}

function toggleInfoContainer(){
    window.open("https://github.com/egle-na/GroupIt-Extension", "_blank");
}

function showMessage(message){
    messageContainer.innerHTML = `<p>${message}</p>`;
    messageContainer.classList.add("visible");
    setTimeout(()=>{
        messageContainer.classList.remove("visible");
    },5000)
}

function gridDeleteActions(event) {
    if (layoutContainer.classList.contains("list")) return; // end if layout is "list"
    event.preventDefault();

    let index = event.target.closest("button")?.dataset?.open;
    if(!index) return; // end if clicked not on the group button

    messageContainer.innerHTML = `
        <button id="delete--grid" class="group-color--red">
            Delete "${myGroups[index].title}"
        </button>
    `
    messageContainer.classList.add("visible");

    document.getElementById("delete--grid").addEventListener("click", function confirmDelete() {
        deleteGroup(index);
        messageContainer.classList.remove(`visible`);
        messageContainer.innerHTML = "";
        document.getElementById("delete--grid")?.removeEventListener("click", confirmDelete);
    });
    document.body.addEventListener("click", function closeDeleteConfirmation() {
        messageContainer.classList.remove(`visible`);
        messageContainer.innerHTML = "";
        document.body.removeEventListener("click", closeDeleteConfirmation);
    });
}

renderContainer.addEventListener("click", handleClick);
renderContainer.addEventListener("contextmenu", gridDeleteActions);

saveBtn.addEventListener("click", addGroup);
layoutBtn.addEventListener("click", toggleLayout);
colorModeBtn.addEventListener("click", toggleDarkMode);
infoBtn.addEventListener("click", toggleInfoContainer);