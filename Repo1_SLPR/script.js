// --- DOM Elements ---
        const usernameInput = document.getElementById('usernameInput');
        const fetchRostersButton = document.getElementById('fetchRostersButton');
        const fetchOwnershipButton = document.getElementById('fetchOwnershipButton');
        const leagueSelect = document.getElementById('leagueSelect');
        const rosterControls = document.getElementById('rosterControls');
        const loadingIndicator = document.getElementById('loading');
        const welcomeScreen = document.getElementById('welcome-screen');
        const formatIndicator = document.getElementById('formatIndicator');
        const rosterView = document.getElementById('rosterView');
        const playerListView = document.getElementById('playerListView');
        const rosterContainer = document.getElementById('rosterContainer');
        const rosterGrid = document.getElementById('rosterGrid');
        const compareButton = document.getElementById('compareButton');
        const clearCompareButton = document.getElementById('clearCompareButton');
        const positionalViewBtn = document.getElementById('positionalViewBtn');
        const depthChartViewBtn = document.getElementById('depthChartViewBtn');
        const viewControls = document.getElementById('view-controls');
        const positionalFiltersContainer = document.getElementById('positional-filters');
        const tradeSimulator = document.getElementById('tradeSimulator');
        const mainContent = document.getElementById('content');

        // --- State ---
        let state = { userId: null, leagues: [], players: {}, oneQbData: {}, sflxData: {}, currentLeagueId: null, isSuperflex: false, cache: {}, teamsToCompare: new Set(), isCompareMode: false, currentRosterView: 'positional', activePositions: new Set(), tradeBlock: {} };
        const assignedLeagueColors = new Map();
        let nextColorIndex = 0;
        const assignedRyColors = new Map();
        let nextRyColorIndex = 0;

        // --- Constants ---
        const API_BASE = 'https://api.sleeper.app/v1';
        const GOOGLE_SHEET_ID = '1MDTf1IouUIrm4qabQT9E5T0FsJhQtmaX55P32XK5c_0';
        const TAG_COLORS = { QB:"#ff2a6d", RB:"#00ceb8", WR:"#58a7ff", TE:"#ffae58", BN:"#475569", TX:"#677588", FLX: "#a855f7", SFLX: "#ff1d7b" };
        const STARTER_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'];
        const TEAM_COLORS = { ARI:"#97233F", ATL:"#A71930", BAL:"#241773", BUF:"#00338D", CAR:"#0085CA", CHI:"#0B162A", CIN:"#FB4F14", CLE:"#311D00", DAL:"#003594", DEN:"#FB4F14", DET:"#0076B6", GB:"#203731", HOU:"#03202F", IND:"#002C5F", JAX:"#006778", KC:"#E31837", LAC:"#0080C6", LAR:"#003594", LV:"#A5ACAF", MIA:"#008E97", MIN:"#4F2683", NE:"#002244", NO:"#D3BC8D", NYG:"#0B2265", NYJ:"#125740", PHI:"#004C54", PIT:"#FFB612", SEA:"#69BE28", SF:"#B3995D", TB:"#D50A0A", TEN:"#4B92DB", WAS:"#5A1414", FA: "#64748b" };
        const LEAGUE_COLOR_PALETTE = ['#e8d28a', '#bfeee5', '#d9d0ff', '#cfe9ff', '#ffd6e7', '#d9ffcf', '#ffc7a8', '#a8d8ff', '#f2c8ff', '#c8ffde'];
        const RY_COLOR_PALETTE = ['#d7f2ff', '#cfe9ff', '#e0f6ea', '#fff1d6', '#efe2ff', '#ffe0ea', '#e4f0ff'];
        const LEAGUE_ABBR_OVERRIDES = { "Big Boofers Club(BBC)": "BBC", "Dynasty footballers": "DFBS", "FF D-League": "DL", "La Leaguaaa dynasty est2024": "LLGA", "The Most Important League": "TMIL", "Trade, Hoard, Eat. League": "THE" };

        // --- Event Listeners ---
        fetchRostersButton.addEventListener('click', handleFetchRosters);
        fetchOwnershipButton.addEventListener('click', handleFetchOwnership);
        leagueSelect.addEventListener('change', handleLeagueSelect);
        rosterGrid.addEventListener('click', handleTeamSelect);
        mainContent.addEventListener('click', handleAssetClickForTrade);
        compareButton.addEventListener('click', handleCompareClick);
        clearCompareButton.addEventListener('click', handleClearCompare);
        positionalViewBtn.addEventListener('click', () => setRosterView('positional'));
        depthChartViewBtn.addEventListener('click', () => setRosterView('depth'));
        positionalFiltersContainer.addEventListener('click', handlePositionFilter);
        
        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', async () => {
            setLoading(true, 'Loading initial data...');
            await Promise.all([ fetchSleeperPlayers(), fetchDataFromGoogleSheet() ]);
            setLoading(false);
            welcomeScreen.classList.remove('hidden');
            viewControls.classList.add('hidden'); // Initially hide view controls
        });

        // --- View Toggling and Main Handlers ---
        function setRosterView(view) {
            state.currentRosterView = view;
            positionalViewBtn.classList.toggle('active', view === 'positional');
            depthChartViewBtn.classList.toggle('active', view === 'depth');
            if (state.currentTeams) {
                renderAllTeamData(state.currentTeams);
            }
        }

        function updateButtonStates(activeButton) {
            fetchRostersButton.classList.toggle('active', activeButton === 'rosters');
            fetchOwnershipButton.classList.toggle('active', activeButton === 'ownership');
        }

        async function handleFetchRosters() {
            const username = usernameInput.value.trim();
            if (!username) return;
            
            setLoading(true, 'Fetching user leagues...');
            
            try {
                await fetchAndSetUser(username);
                const leagues = await fetchUserLeagues(state.userId);
                state.leagues = leagues.sort((a, b) => a.name.localeCompare(b.name));
                
                updateButtonStates('rosters');
                rosterControls.classList.remove('hidden');
                playerListView.classList.add('hidden');
                rosterView.classList.remove('hidden');
                viewControls.classList.remove('hidden');
                setRosterView('positional'); // Set default view
                
                populateLeagueSelect(state.leagues);

                if (state.leagues.length > 0) {
                    leagueSelect.selectedIndex = 1;
                    await handleLeagueSelect();
                }
            } catch (error) {
                handleError(error, username);
            } finally {
                setLoading(false);
            }
        }

        async function handleFetchOwnership() {
            const username = usernameInput.value.trim();
            if (!username) return;
            
            setLoading(true, 'Fetching ownership data...');

            try {
                await fetchAndSetUser(username);
                
                updateButtonStates('ownership');
                rosterControls.classList.add('hidden');
                rosterView.classList.add('hidden');
                playerListView.classList.remove('hidden');
                viewControls.classList.add('hidden');

                await renderPlayerList();
            } catch (error) {
                handleError(error, username);
            } finally {
                setLoading(false);
            }
        }

        async function handleLeagueSelect() {
            const leagueId = leagueSelect.value;
            if (!leagueId || leagueId === 'Select a league...') {
                rosterView.classList.add('hidden');
                return;
            };
            
            state.currentLeagueId = leagueId;
            handleClearCompare(); // Clear compare state on league change
            const leagueInfo = state.leagues.find(l => l.league_id === leagueId);
            const leagueName = leagueInfo?.name || 'league';
            setLoading(true, `Loading ${leagueName}...`);
            rosterGrid.innerHTML = '';

            try {
                const rosterPositions = leagueInfo.roster_positions;
                const superflexSlots = rosterPositions.filter(p => p === 'SUPER_FLEX').length;
                const qbSlots = rosterPositions.filter(p => p === 'QB').length;
                state.isSuperflex = (superflexSlots > 0) || (qbSlots > 1);
                
                formatIndicator.textContent = state.isSuperflex ? 'SFLX' : '1QB';
                formatIndicator.classList.toggle('format-sflx', state.isSuperflex);
                formatIndicator.classList.toggle('format-1qb', !state.isSuperflex);
                formatIndicator.classList.remove('hidden');

                const [rosters, users, tradedPicks] = await Promise.all([
                    fetchWithCache(`${API_BASE}/league/${leagueId}/rosters`),
                    fetchWithCache(`${API_BASE}/league/${leagueId}/users`),
                    fetchWithCache(`${API_BASE}/league/${leagueId}/traded_picks`),
                ]);
                
                const teams = processRosterData(rosters, users, tradedPicks, leagueInfo);
                
                // Automatically select the user's team for comparison
                const userTeam = teams.find(team => team.isUserTeam);
                if (userTeam) {
                    state.teamsToCompare.add(userTeam.teamName);
                }
                updateCompareButtonState();

                renderAllTeamData(teams);
                
                rosterView.classList.remove('hidden');

            } catch (error) {
                console.error(`Error loading league ${leagueId}:`, error);
            } finally {
                setLoading(false);
            }
        }
        
        // --- Compare & Trade Logic ---
        function handleTeamSelect(e) {
            const header = e.target.closest('.team-header-item');
            if (header) {
                const checkbox = header.querySelector('.team-compare-checkbox');
                const teamName = checkbox.dataset.teamName;
                checkbox.classList.toggle('selected');
                if (state.teamsToCompare.has(teamName)) {
                    state.teamsToCompare.delete(teamName);
                } else {
                    state.teamsToCompare.add(teamName);
                }
                updateCompareButtonState();
            }
        }

        function handleCompareClick() {
            state.isCompareMode = !state.isCompareMode;
            rosterView.classList.toggle('is-trade-mode', state.isCompareMode);
            updateCompareButtonState();
            renderAllTeamData(state.currentTeams); 
            renderTradeBlock();
        }

        function handleClearCompare() {
            state.teamsToCompare.clear();
            state.isCompareMode = false;
            rosterView.classList.remove('is-trade-mode');
            document.querySelectorAll('.team-compare-checkbox.selected').forEach(el => el.classList.remove('selected'));
            updateCompareButtonState();
            clearTrade();
            if (state.currentTeams) {
                renderAllTeamData(state.currentTeams);
            }
        }

        function updateCompareButtonState() {
            const count = state.teamsToCompare.size;
            compareButton.disabled = count < 2;
            clearCompareButton.classList.toggle('hidden', count === 0);

            if (state.isCompareMode) {
                compareButton.textContent = 'Show All';
                compareButton.classList.replace('bg-pink-600', 'bg-pink-800');
            } else {
                compareButton.textContent = 'Compare';
                compareButton.classList.replace('bg-pink-800', 'bg-pink-600');
            }
            
            if (count < 2 && state.isCompareMode) {
                handleCompareClick(); // Automatically exit compare mode
            }
        }

        function handleAssetClickForTrade(e) {
            if (!state.isCompareMode) return;

            const assetRow = e.target.closest('.player-row, .pick-row');
            if (!assetRow) return;

            const teamName = assetRow.closest('.roster-column')?.dataset.teamName;
            if (!teamName || !state.teamsToCompare.has(teamName)) return;

            const { assetId, assetLabel, assetKtc } = assetRow.dataset;
            if (!assetId) return;

            // Initialize trade block for the team if it doesn't exist
            if (!state.tradeBlock[teamName]) {
                state.tradeBlock[teamName] = [];
            }

            const assetIndex = state.tradeBlock[teamName].findIndex(a => a.id === assetId);

            if (assetIndex > -1) {
                // Asset is already selected, so remove it
                state.tradeBlock[teamName].splice(assetIndex, 1);
                assetRow.classList.remove('player-selected');
            } else {
                // Asset not selected, so add it
                state.tradeBlock[teamName].push({
                    id: assetId,
                    label: assetLabel,
                    ktc: parseInt(assetKtc, 10) || 0
                });
                assetRow.classList.add('player-selected');
            }
            
            renderTradeBlock();
        }

        function clearTrade() {
            state.tradeBlock = {};
            document.querySelectorAll('.player-selected').forEach(el => el.classList.remove('player-selected'));
            renderTradeBlock();
        }


        // --- Position Filter Logic ---
        function handlePositionFilter(e) {
            if (e.target.tagName !== 'BUTTON') return;
            const btn = e.target;
            const position = btn.dataset.position;
            const flexPositions = ['RB', 'WR', 'TE'];

            if (position === 'FLX') {
                const isActivating = !state.activePositions.has('FLX');
                state.activePositions.clear();
                if (isActivating) {
                    flexPositions.forEach(p => state.activePositions.add(p));
                    state.activePositions.add('FLX');
                }
            } else {
                state.activePositions.delete('FLX');
                if (state.activePositions.has(position)) {
                    state.activePositions.delete(position);
                } else {
                    state.activePositions.add(position);
                }
            }
            
            updatePositionFilterButtons();
            renderAllTeamData(state.currentTeams);
        }
        
        function updatePositionFilterButtons() {
            const buttons = positionalFiltersContainer.querySelectorAll('.filter-btn');
            buttons.forEach(btn => {
                const pos = btn.dataset.position;
                btn.classList.toggle('active', state.activePositions.has(pos));
            });
        }


        // --- Data Fetching & Processing ---
        async function fetchAndSetUser(username) {
            const userRes = await fetchWithCache(`${API_BASE}/user/${username}`);
            if (!userRes || !userRes.user_id) throw new Error('User not found.');
            state.userId = userRes.user_id;
        }

        async function fetchUserLeagues(userId) {
            const currentYear = new Date().getFullYear();
            const leaguesRes = await fetchWithCache(`${API_BASE}/user/${userId}/leagues/nfl/${currentYear}`);
            if (!leaguesRes || leaguesRes.length === 0) throw new Error(`No leagues found for this user for ${currentYear}.`);
            return leaguesRes;
        }

        async function fetchSleeperPlayers() {
            try { state.players = await fetchWithCache(`${API_BASE}/players/nfl`); } catch (e) { console.error("Failed to fetch Sleeper players:", e); }
        }
        
        async function fetchDataFromGoogleSheet() {
            const sheetNames = { oneQb: 'KTC_1QB', sflx: 'KTC_SFLX' };
            try {
                const [oneQbCsv, sflxCsv] = await Promise.all([
                    fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetNames.oneQb}`).then(res => res.text()),
                    fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheetNames.sflx}`).then(res => res.text())
                ]);
                state.oneQbData = parseSheetData(oneQbCsv);
                state.sflxData = parseSheetData(sflxCsv);
            } catch (e) { console.error("Fatal Error: Could not fetch data from Google Sheet.", e); }
        }

        function parseSheetData(csvText) {
            const dataMap = {};
            const lines = csvText.split(/\r?\n/).slice(1);
            lines.forEach(line => {
                const columns = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (columns.length < 13) return;
                const clean = (str) => str ? str.replace(/"/g, '').trim() : '';
                const pos = clean(columns[2]);
                const sleeperId = clean(columns[12]);
                const adp = parseFloat(clean(columns[11]));
                const ktcValue = parseInt(clean(columns[6]), 10);
                if (pos === 'RDP') {
                    const pickName = clean(columns[1]);
                    if (pickName) dataMap[pickName] = { adp: null, ktc: ktcValue };
                } else if (sleeperId && sleeperId !== 'NA') {
                    dataMap[sleeperId] = { adp: isNaN(adp) ? null : adp, ktc: isNaN(ktcValue) ? null : ktcValue };
                }
            });
            return dataMap;
        }

        function processRosterData(rosters, users, tradedPicks, leagueInfo) {
            const userMap = users.reduce((acc, user) => ({ ...acc, [user.user_id]: user }), {});
            const rosterPositions = leagueInfo.roster_positions;
            const taxiSlots = leagueInfo.settings.taxi_slots || 0;

            const teams = rosters.map(roster => {
                const owner = userMap[roster.owner_id];
                const allPlayers = roster.players || [];
                
                const starterIds = roster.starters || [];
                const starters = starterIds.map((playerId, index) => {
                    const slot = rosterPositions[index] || 'FLEX';
                    return getPlayerData(playerId, slot);
                }).sort((a, b) => STARTER_ORDER.indexOf(a.slot) - STARTER_ORDER.indexOf(b.slot));

                const currentTaxiPlayers = (roster.taxi || []).map(p => getPlayerData(p, 'TX')).sort((a, b) => (b.ktc || 0) - (a.ktc || 0));
                const emptyTaxiSlots = Array(Math.max(0, taxiSlots - currentTaxiPlayers.length)).fill({ isPlaceholder: true });
                const taxi = [...currentTaxiPlayers, ...emptyTaxiSlots];

                const bench = allPlayers.filter(pId => pId && !starterIds.includes(pId) && !(roster.taxi || []).includes(pId));
                const draftPicks = getOwnedPicks(roster.roster_id, tradedPicks, leagueInfo);
                
                return {
                    isUserTeam: roster.owner_id === state.userId,
                    teamName: owner?.display_name || `Team ${roster.roster_id}`,
                    starters,
                    bench: bench.map(p => getPlayerData(p, 'BN')).sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                    taxi,
                    draftPicks: draftPicks.map(p => getPickData(p, leagueInfo)),
                    allPlayers: allPlayers.map(pId => getPlayerData(pId, '')) // For positional view
                };
            });
            
            state.currentTeams = teams; // Cache the full list of teams for the league

            return teams.sort((a, b) => {
                if (a.isUserTeam) return -1;
                if (b.isUserTeam) return 1;
                return a.teamName.localeCompare(b.teamName);
            });
        }
        
        function getOwnedPicks(rosterId, tradedPicks, leagueInfo) {
            const defaultRounds = leagueInfo.settings.draft_rounds || 5;
            const leagueSeason = parseInt(leagueInfo.season);
            const firstPickSeason = leagueSeason + 1;
            let ownedPicks = [];

            for (let i = 0; i < 4; i++) {
                const season = firstPickSeason + i;
                for (let round = 1; round <= defaultRounds; round++) {
                    ownedPicks.push({ season: String(season), round, original_owner_id: rosterId });
                }
            }

            tradedPicks.forEach(pick => {
                if (pick.roster_id === rosterId && pick.owner_id !== rosterId) {
                    const i = ownedPicks.findIndex(p => p.season === pick.season && p.round === pick.round && p.original_owner_id === rosterId);
                    if (i > -1) ownedPicks.splice(i, 1);
                }
                if (pick.owner_id === rosterId && pick.roster_id !== rosterId) {
                    if (parseInt(pick.season) >= firstPickSeason) {
                        ownedPicks.push({ season: pick.season, round: pick.round, original_owner_id: pick.roster_id });
                    }
                }
            });
            ownedPicks = ownedPicks.filter(p => parseInt(p.season) < 2029);
            return ownedPicks.sort((a, b) => a.season.localeCompare(b.season) || a.round - b.round);
        }

        function getPlayerData(playerId, slot) {
            const player = state.players[playerId];
            if (!player) return { id: playerId, name: 'Unknown Player', pos: '?', age: '?', team: '?', adp: null, ktc: null, slot };
            const valueData = state.isSuperflex ? state.sflxData[playerId] : state.oneQbData[playerId];
            let lastName = player.last_name || '';
            if (lastName.includes('-')) lastName = lastName.split('-')[0];
            let displayName = `${player.first_name.charAt(0)}. ${lastName}`;
            if (displayName.length > 15) displayName = displayName.substring(0, 14) + '…';

            return { id: playerId, name: displayName, pos: player.position || '?', age: player.age || '?', team: player.team || 'FA', adp: valueData?.adp || null, ktc: valueData?.ktc || null, slot };
        }

        function getPickData(pick) {
            const { season, round } = pick;
            const label = `${season} ${ordinalSuffix(round)}`;
            const staticVals = { oneqb: { 1: 5200, 2: 3200, 3: 2000, 4: 1200, 5: 400 }, sflx: { 1: 4300, 2: 2600, 3: 1700, 4: 1000, 5: 400 } };
            let ktc = null;
            if (parseInt(season) >= 2028 || round >= 5) {
                ktc = (state.isSuperflex ? staticVals.sflx : staticVals.oneqb)[round] || null;
            } else {
                const sfx = round === 1 ? 'st' : round === 2 ? 'nd' : round === 3 ? 'rd' : 'th';
                const ktcKey = `${season} Mid ${round}${sfx}`;
                const dataSet = state.isSuperflex ? state.sflxData : state.oneQbData;
                ktc = dataSet[ktcKey]?.ktc || null;
            }
            return { label, ktc, id: `${season}-${round}-${pick.original_owner_id}` };
        }

        // --- UI Rendering ---
        function populateLeagueSelect(leagues) {
            leagueSelect.innerHTML = '<option>Select a league...</option>';
            leagues.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.league_id;
                opt.textContent = l.name;
                leagueSelect.appendChild(opt);
            });
            leagueSelect.disabled = false;
        }

        function renderAllTeamData(teams) {
            rosterGrid.innerHTML = '';
            let teamsToRender = teams;
            if (state.isCompareMode) {
                teamsToRender = teams.filter(team => state.teamsToCompare.has(team.teamName));
            }

            teamsToRender.forEach(team => {
                const columnWrapper = document.createElement('div');
                columnWrapper.className = 'roster-column';
                columnWrapper.dataset.teamName = team.teamName;
                
                const header = document.createElement('div');
                header.className = 'team-header-item';
                
                const checkbox = document.createElement('div');
                checkbox.className = 'team-compare-checkbox';
                if (state.teamsToCompare.has(team.teamName)) {
                    checkbox.classList.add('selected');
                }
                checkbox.dataset.teamName = team.teamName;
                
                const teamNameSpan = document.createElement('span');
                teamNameSpan.textContent = team.teamName;
                
                header.appendChild(checkbox);
                header.appendChild(teamNameSpan);
                
                const card = state.currentRosterView === 'positional' ? createPositionalTeamCard(team) : createDepthChartTeamCard(team);
                
                columnWrapper.appendChild(header);
                columnWrapper.appendChild(card);
                rosterGrid.appendChild(columnWrapper);
            });
        }

        function createDepthChartTeamCard(team) {
            const card = document.createElement('div');
            card.className = 'team-card';
            card.innerHTML = `<div class="roster-section starters-section"><h3>Starters</h3></div><div class="roster-section bench-section"><h3>Bench</h3></div><div class="roster-section taxi-section"><h3>Taxi</h3></div><div class="roster-section picks-section"><h3>Draft Picks</h3></div>`;
            
            const filterActive = state.activePositions.size > 0;
            const filterFunc = player => !filterActive || state.activePositions.has(player.pos) || (state.activePositions.has('FLX') && ['RB', 'WR', 'TE'].includes(player.pos));

            const populate = (sel, data, creator) => {
                const el = card.querySelector(sel);
                const filteredData = data.filter(item => item.isPlaceholder || filterFunc(item));
                
                const h3 = el.querySelector('h3');
                el.innerHTML = '';
                el.appendChild(h3);

                if (filteredData.length > 0) {
                    filteredData.forEach(item => el.appendChild(creator(item)));
                } else {
                    el.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
                }
            };

            populate('.starters-section', team.starters, createPlayerRow);
            populate('.bench-section', team.bench, createPlayerRow);
            populate('.taxi-section', team.taxi, createTaxiRow);
            
            const picksEl = card.querySelector('.picks-section');
            const picksH3 = picksEl.querySelector('h3');
            picksEl.innerHTML = '';
            picksEl.appendChild(picksH3);
            if (team.draftPicks && team.draftPicks.length > 0) {
                team.draftPicks.forEach(item => picksEl.appendChild(createPickRow(item)));
            } else {
                picksEl.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
            }
            return card;
        }

        function createPositionalTeamCard(team) {
            const card = document.createElement('div');
            card.className = 'team-card';
            card.innerHTML = `
                <div class="roster-section qb-section"><h3>QB</h3></div>
                <div class="roster-section rb-section"><h3>RB</h3></div>
                <div class="roster-section wr-section"><h3>WR</h3></div>
                <div class="roster-section te-section"><h3>TE</h3></div>
                <div class="roster-section picks-section"><h3>Draft Picks</h3></div>
            `;

            const filterActive = state.activePositions.size > 0;

            const positions = {
                QB: team.allPlayers.filter(p => p.pos === 'QB').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                RB: team.allPlayers.filter(p => p.pos === 'RB').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                WR: team.allPlayers.filter(p => p.pos === 'WR').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
                TE: team.allPlayers.filter(p => p.pos === 'TE').sort((a, b) => (b.ktc || 0) - (a.ktc || 0)),
            };

            const populate = (sel, data, creator) => {
                const el = card.querySelector(sel);
                const pos = sel.split('-')[0].toUpperCase().replace('.', '');
                
                const h3 = el.querySelector('h3');
                el.innerHTML = '';
                el.appendChild(h3);

                if (!filterActive || state.activePositions.has(pos) || (state.activePositions.has('FLX') && ['RB', 'WR', 'TE'].includes(pos))) {
                    el.style.display = 'block';
                    if (data && data.length > 0) {
                        data.forEach(item => el.appendChild(creator(item)));
                    } else {
                        el.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
                    }
                } else {
                    el.style.display = 'none';
                }
            };

            populate('.qb-section', positions.QB, createPlayerRow);
            populate('.rb-section', positions.RB, createPlayerRow);
            populate('.wr-section', positions.WR, createPlayerRow);
            populate('.te-section', positions.TE, createPlayerRow);
            
            const picksEl = card.querySelector('.picks-section');
            const picksH3 = picksEl.querySelector('h3');
            picksEl.innerHTML = '';
            picksEl.appendChild(picksH3);
            if (team.draftPicks && team.draftPicks.length > 0) {
                team.draftPicks.forEach(item => picksEl.appendChild(createPickRow(item)));
            } else {
                picksEl.innerHTML += `<div class="text-xs text-slate-500 p-1 italic">None</div>`;
            }
            return card;
        }

        function createEmptyTaxiRow() {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.innerHTML = `<span style="color: #475569; font-style: italic; font-size: 11px; padding: 13px 4px; display: block; width: 100%; text-align: center;">Empty Slot</span>`;
            return row;
        }
        
        function createTaxiRow(item) {
            if (item.isPlaceholder) return createEmptyTaxiRow();
            return createPlayerRow(item);
        }

        function createPlayerRow(player) {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.dataset.assetId = player.id;
            row.dataset.assetLabel = player.name;
            row.dataset.assetKtc = player.ktc || 0;

            if (state.isCompareMode && state.tradeBlock[row.closest('.roster-column')?.dataset.teamName]?.find(a => a.id === player.id)) {
                row.classList.add('player-selected');
            }

            const adp = player.adp ? player.adp.toFixed(1) : '—';
            const ktc = player.ktc || '—';
            const slotAbbr = { 'SUPER_FLEX': 'SFLX', 'FLEX': 'FLX' };
            const displaySlot = state.currentRosterView === 'depth' ? (slotAbbr[player.slot] || player.slot) : player.pos;
            const teamTagHTML = player.team && player.team !== 'FA' ? `<div class="team-tag" style="color: ${TEAM_COLORS[player.team] || '#64748b'};">${player.team}</div>` : `<span class="player-team">${player.team || 'FA'}</span>`;
            const tagsWithLargerFont = ['QB', 'RB', 'WR', 'TE', 'FLX', 'BN', 'TX'];
            let fontStyle = tagsWithLargerFont.includes(displaySlot) ? 'font-size: 10px;' : '';

            row.innerHTML = `<div class="player-info-wrapper"><div class="player-name-line"><div class="player-tag" style="background-color: ${TAG_COLORS[displaySlot] || '#475569'}; ${fontStyle}">${displaySlot}</div><div class="player-name">${player.name}</div></div><div class="player-meta-line"><span>Age: <span class="player-age">${player.age || '?'}</span></span><span class="separator">•</span><span class="player-pos">${player.pos}</span><span class="separator">•</span>${teamTagHTML}</div><div class="player-value-line"><span>KTC: <span class="value player-ktc">${ktc}</span></span><span class="separator">•</span><span>ADP: <span class="value player-adp">${adp}</span></span></div></div>`;
            
            const ageEl = row.querySelector('.player-age'), posEl = row.querySelector('.player-pos'), adpEl = row.querySelector('.player-adp'), ktcEl = row.querySelector('.player-ktc');
            if (posEl) posEl.style.color = getPosColor(player.pos);
            if (ageEl && player.age) ageEl.style.color = getAgeColorForRoster(player.pos, player.age);
            if (adpEl && player.adp) adpEl.style.color = getAdpColorForRoster(parseFloat(adp));
            if (ktcEl && player.ktc) ktcEl.style.color = getKtcColor(player.ktc);
            return row;
        }

        function createPickRow(pick) {
            const row = document.createElement('div');
            row.className = 'pick-row';
            row.dataset.assetId = pick.id;
            row.dataset.assetLabel = pick.label;
            row.dataset.assetKtc = pick.ktc || 0;

            if (state.isCompareMode && state.tradeBlock[row.closest('.roster-column')?.dataset.teamName]?.find(a => a.id === pick.id)) {
                row.classList.add('player-selected');
            }
            
            const ktcValue = pick.ktc || '—';
            row.innerHTML = `<span class="pick-label">${pick.label}</span><span class="pick-ktc">KTC: <span class="pick-ktc-value">${ktcValue}</span></span>`;
            if (pick.ktc) row.querySelector('.pick-ktc-value').style.color = getKtcColor(pick.ktc);
            return row;
        }

        function renderTradeBlock() {
            if (!state.isCompareMode || state.teamsToCompare.size < 2) {
                tradeSimulator.style.display = 'none';
                mainContent.style.paddingBottom = '1rem';
                return;
            }

            tradeSimulator.style.display = 'flex';
            tradeSimulator.innerHTML = `
                <div class="trade-header">
                    <h3>Trade Preview</h3>
                    <button id="clearTradeButton">Clear</button>
                </div>
                <div class="trade-body"></div>
            `;

            const tradeBody = tradeSimulator.querySelector('.trade-body');
            const teamNames = Array.from(state.teamsToCompare);
            const tradeData = {};

            teamNames.forEach(name => {
                const assets = state.tradeBlock[name] || [];
                const totalKtc = assets.reduce((sum, asset) => sum + asset.ktc, 0);
                tradeData[name] = { assets, totalKtc };
            });

            const totals = teamNames.map(name => tradeData[name].totalKtc);
            const teamColors = {};

            if (teamNames.length === 2) {
                const diff = totals[0] - totals[1];
                if (diff > 1000) {
                    teamColors[teamNames[0]] = '#2dd4bf'; // Teal
                    teamColors[teamNames[1]] = '#fb7185'; // Reddish
                } else if (diff < -1000) {
                    teamColors[teamNames[0]] = '#fb7185'; // Reddish
                    teamColors[teamNames[1]] = '#2dd4bf'; // Teal
                } else {
                    teamColors[teamNames[0]] = '#60a5fa'; // Bluish
                    teamColors[teamNames[1]] = '#60a5fa'; // Bluish
                }
            }


            teamNames.forEach(teamName => {
                const column = document.createElement('div');
                column.className = 'trade-team-column';
                
                const { assets, totalKtc } = tradeData[teamName];

                let assetsHTML = '';
                assets.forEach(asset => {
                    const ktcColor = getKtcColor(asset.ktc);
                    assetsHTML += `<div class="trade-asset-chip"><span>${asset.label}</span><span class="ktc" style="color: ${ktcColor}">(${asset.ktc})</span></div>`;
                });
                
                const totalColor = teamColors[teamName] || 'inherit';

                column.innerHTML = `
                    <h4>${teamName}</h4>
                    <div class="trade-assets">${assetsHTML || '<span class="text-xs text-slate-500">Select assets...</span>'}</div>
                    <div class="trade-total" style="color: ${totalColor}">Total KTC: ${totalKtc}</div>
                `;
                tradeBody.appendChild(column);
            });

            document.getElementById('clearTradeButton').addEventListener('click', clearTrade);
            mainContent.style.paddingBottom = `${tradeSimulator.offsetHeight + 20}px`;
        }


        // --- Player List (Ownership) Functions ---
        async function renderPlayerList() {
            playerListView.innerHTML = '<p class="text-center p-4">Fetching user leagues and rosters...</p>';
            assignedLeagueColors.clear();
            nextColorIndex = 0;
            assignedRyColors.clear();
            nextRyColorIndex = 0;

            const userLeagues = await fetchUserLeagues(state.userId);
            const rostersByLeague = await Promise.all(userLeagues.map(l => fetchWithCache(`${API_BASE}/league/${l.league_id}/rosters`)));

            const agg = new Map();
            rostersByLeague.forEach((rosters, idx) => {
                const leagueName = userLeagues[idx].name;
                const leagueAbbr = getLeagueAbbr(leagueName);
                const myRoster = rosters.find(r => r.owner_id === state.userId || (Array.isArray(r.co_owners) && r.co_owners.includes(state.userId)));
                if (!myRoster) return;
                const pids = new Set((myRoster.players || []).filter(Boolean));
                pids.forEach(pid => {
                    if (!agg.has(pid)) agg.set(pid, new Set());
                    agg.get(pid).add(leagueAbbr);
                });
            });

            const section = document.createElement('div');
            section.className = 'player-list-section';
            
            const header = document.createElement('div');
            header.className = 'pl-player-row pl-list-header';
            
            // Rebuild header programmatically for alignment
            header.innerHTML = ''; // Clear it first
            const tagSpacer = document.createElement('div');
            tagSpacer.className = 'pl-list-tag-spacer';
            header.appendChild(tagSpacer);

            const headerInfo = document.createElement('div');
            headerInfo.className = 'pl-player-info';
            headerInfo.innerHTML = '<div class="pl-player-name">Player & Info</div>';
            header.appendChild(headerInfo);

            const headerMeta = document.createElement('div');
            headerMeta.className = 'pl-right-meta';

            const hCount = document.createElement('span');
            hCount.className = 'pl-col-count';
            hCount.textContent = '#';
            headerMeta.appendChild(hCount);

            const hPct = document.createElement('span');
            hPct.className = 'pl-col-pct';
            hPct.textContent = '%';
            headerMeta.appendChild(hPct);

            const hLgs = document.createElement('span');
            hLgs.className = 'pl-col-lgs';
            hLgs.textContent = 'Leagues';
            headerMeta.appendChild(hLgs);

            header.appendChild(headerMeta);
            section.appendChild(header);

            const rows = Array.from(agg.entries()).map(([pid, leagueSet]) => createPlayerListRow(pid, leagueSet, userLeagues.length)).filter(Boolean);
            rows.sort((a, b) => {
                const countDiff = Number(b.dataset.count || 0) - Number(a.dataset.count || 0);
                if (countDiff !== 0) return countDiff;
                return a.dataset.search.localeCompare(b.dataset.search);
            });

            rows.forEach(r => section.appendChild(r));
            playerListView.innerHTML = '';
            playerListView.appendChild(section);
            
            const searchInput = document.createElement('input');
            searchInput.id = 'playerSearch';
            searchInput.type = 'text';
            searchInput.placeholder = 'Filter players by name...';
            playerListView.prepend(searchInput);

            searchInput.oninput = () => {
                const term = searchInput.value.trim().toLowerCase();
                section.querySelectorAll('.pl-player-row:not(.pl-list-header)').forEach(r => {
                    r.style.display = (r.dataset.search || '').includes(term) ? 'flex' : 'none';
                });
            };
        }

        function createPlayerListRow(pid, leagueSet, totalLeagues) {
            const p = state.players[pid];
            if (!p) return null;

            const pos = p.position || (p.fantasy_positions && p.fantasy_positions[0]) || '';
            const first = (p.first_name || '').trim();
            const last = (p.last_name || '').trim();
            let displayName = `${first} ${last}`.trim() || pid;
            if (first && last) displayName = `${first.charAt(0)}. ${last}`;

            const row = document.createElement('div');
            row.className = 'pl-player-row';
            row.dataset.search = `${first.toLowerCase()} ${last.toLowerCase()} ${displayName.toLowerCase()}`;
            row.dataset.count = leagueSet.size;

            const listTag = document.createElement('div');
            listTag.className = 'pl-list-tag';
            listTag.textContent = pos || '';
            listTag.style.backgroundColor = (pos && TAG_COLORS[pos]) || '#475569';
            
            const playerInfo = document.createElement('div');
            playerInfo.className = 'pl-player-info';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'pl-player-name';
            nameDiv.innerHTML = `
                <span>${displayName}</span>
                <span class="team-tag ml-2" style="color: ${TEAM_COLORS[p.team] || '#475569'};">${p.team || 'FA'}</span>
                ${p.age ? `<span class="ml-1" style="font-size: 9px; color: #aab8d0;">Age: <span style="color:${getAgeColorForRoster(p.position, p.age) || 'inherit'}">${p.age}</span></span>` : ''}
            `;

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'pl-player-details';
            const detailParts = [];
            const adp1QB = state.oneQbData[pid]?.adp;
            const adpSFLX = state.sflxData[pid]?.adp;
            const rookieYear = deriveRookieYear(p);

            if (adp1QB) detailParts.push(`ADP <span style="color:${getAdpColorForRoster(adp1QB) || 'inherit'}">${adp1QB.toFixed(1)}</span>`);
            if (adpSFLX) detailParts.push(`SFLX <span style="color:${getAdpColorForRoster(adpSFLX) || 'inherit'}">${adpSFLX.toFixed(1)}</span>`);
            if (rookieYear) detailParts.push(`RY <span style="color:${getRyColor(rookieYear) || 'inherit'}">${rookieYear}</span>`);
            detailsDiv.innerHTML = detailParts.join(' • ');

            playerInfo.appendChild(nameDiv);
            playerInfo.appendChild(detailsDiv);

            const rightMeta = document.createElement('div');
            rightMeta.className = 'pl-right-meta';
            const count = document.createElement('span');
            count.className = 'pl-col-count';
            count.textContent = leagueSet.size;
            if (leagueSet.size >= totalLeagues * 0.8) count.classList.add('pl-count-high');
            else if (leagueSet.size >= totalLeagues * 0.5) count.classList.add('pl-count-mid');
            else count.classList.add('pl-count-low');

            const pct = document.createElement('span');
            const pctVal = Math.round((leagueSet.size / totalLeagues) * 100);
            pct.className = 'pl-col-pct';
            pct.textContent = `${pctVal}%`;
            if (pctVal >= 80) pct.classList.add('pl-pct-high');
            else if (pctVal >= 50) pct.classList.add('pl-pct-mid');
            else pct.classList.add('pl-pct-low');
            
            const lgs = document.createElement('span');
            lgs.className = 'pl-col-lgs';
            const sortedAbbrs = Array.from(leagueSet).sort();
            sortedAbbrs.forEach((abbr, index) => {
                const abbrSpan = document.createElement('span');
                abbrSpan.textContent = abbr;
                abbrSpan.style.color = getLeagueColor(abbr);
                lgs.appendChild(abbrSpan);
                if (index < sortedAbbrs.length - 1) lgs.appendChild(document.createTextNode(', '));
            });

            rightMeta.appendChild(count);
            rightMeta.appendChild(pct);
            rightMeta.appendChild(lgs);
            row.appendChild(listTag);
            row.appendChild(playerInfo);
            row.appendChild(rightMeta);
            return row;
        }

        // --- Formatting Helpers ---
        function deriveRookieYear(player) {
            if (!player) return null;
            let ry = player.metadata?.rookie_year ? Number(player.metadata.rookie_year) : 0;
            const exp = player.years_exp;
            const expNum = (exp === '' || exp === null || exp === undefined) ? null : Number(exp);
            if ((!ry || ry === 0) && expNum === 0) {
                return new Date().getFullYear();
            }
            return ry > 0 ? ry : null;
        }
        function getKtcColor(v){const s=[{v:9e3,c:"#00EEB6"},{v:8e3,c:"#14D7CB"},{v:7e3,c:"#0599AA"},{v:6e3,c:"#03a8ce"},{v:5500,c:"#0690DC"},{v:5e3,c:"#066CDC"},{v:4500,c:"#1350fd"},{v:4e3,c:"#5e41ff"},{v:3750,c:"#7158ff"},{v:3500,c:"#964eff"},{v:3250,c:"#9200ff"},{v:3e3,c:"#b70fff"},{v:2750,c:"#ba00cc"},{v:2500,c:"#e800ff"},{v:2250,c:"#db00af"},{v:2e3,c:"#c70097"},{v:0,c:"#FF0080"}];if(v===null||v===0)return"#e0e6ed";for(const t of s)if(v>=t.v)return t.c;return s[s.length-1].c}
        function getPosColor(p){return{QB:"#ff1d7b",RB:"#26eba7",WR:"#4a86e8",TE:"#7300ff"}[p]||"#e0e6ed"}
        function getAdpColorForRoster(a){const s=[{v:12,c:"#00EEB6"},{v:24,c:"#14D7CB"},{v:36,c:"#0599AA"},{v:48,c:"#03a8ce"},{v:60,c:"#0690DC"},{v:72,c:"#066CDC"},{v:84,c:"#1350fd"},{v:96,c:"#5e41ff"},{v:108,c:"#7158ff"},{v:120,c:"#964eff"},{v:144,c:"#9200ff"},{v:168,c:"#b70fff"},{v:192,c:"#ba00cc"},{v:216,c:"#e800ff"},{v:240,c:"#db00af"},{v:280,c:"#c70097"},{v:320,c:"#FF0080"}];if(!a||a===0)return null;for(const t of s)if(a<=t.v)return t.c;return s[s.length-1].c}
        function getAgeColorForRoster(p,a){const s={wrTe:[{v:22.5,c:"#00ffc4"},{v:25,c:"#85fff3"},{v:26,c:"#56dfe8"},{v:27,c:"#7dd1ff"},{v:29,c:"#89a3ff"},{v:30,c:"#957cff"},{v:31,c:"#a642ff"},{v:32,c:"#cf60ff"},{v:33,c:"#ff6fe1"}],rb:[{v:22.5,c:"#00ffc4"},{v:24,c:"#85fff3"},{v:25,c:"#56dfe8"},{v:26,c:"#7dd1ff"},{v:27,c:"#89a3ff"},{v:28,c:"#957cff"},{v:29,c:"#a642ff"},{v:30,c:"#cf60ff"},{v:31,c:"#ff6fe1"}],qb:[{v:25.5,c:"#00ffc4"},{v:28,c:"#85fff3"},{v:29,c:"#7dd1ff"},{v:31,c:"#48a6ff"},{v:33,c:"#957cff"},{v:36,c:"#a642ff"},{v:40,c:"#cf60ff"},{v:44,c:"#ff6fe1"}]};let sc=p==="WR"||p==="TE"?s.wrTe:p==="RB"?s.rb:p==="QB"?s.qb:null;if(!sc||!a||a===0)return null;for(const t of sc)if(a<=t.v)return t.c;return sc[sc.length-1].c}
        function getLeagueAbbr(name) { if (!name) return "LG"; if (LEAGUE_ABBR_OVERRIDES[name]) return LEAGUE_ABBR_OVERRIDES[name]; if (name.length <= 4 && !name.includes(' ') && !name.includes('-')) return name.toUpperCase(); const words = name.split(/[\s-]+/); let abbr = words.map(w => w[0] || '').join(''); return abbr.toUpperCase(); }
        function getLeagueColor(abbr) { if (!assignedLeagueColors.has(abbr)) { assignedLeagueColors.set(abbr, LEAGUE_COLOR_PALETTE[nextColorIndex % LEAGUE_COLOR_PALETTE.length]); nextColorIndex++; } return assignedLeagueColors.get(abbr); }
        function getRyColor(year) { if (!assignedRyColors.has(year)) { assignedRyColors.set(year, RY_COLOR_PALETTE[nextRyColorIndex % RY_COLOR_PALETTE.length]); nextRyColorIndex++; } return assignedRyColors.get(year); }
        function ordinalSuffix(i){ const j=i%10, k=i%100; if(j===1&&k!==11) return i+'st'; if(j===2&&k!==12) return i+'nd'; if(j===3&&k!==13) return i+'rd'; return i+'th'; }

        // --- Utility Functions ---
        function setLoading(isLoading, message = 'Loading...') {
            welcomeScreen.classList.add('hidden');
            const buttons = [fetchRostersButton, fetchOwnershipButton];
            if (isLoading) {
                loadingIndicator.textContent = message;
                loadingIndicator.classList.remove('hidden');
                buttons.forEach(btn => { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed'); });
            } else {
                loadingIndicator.classList.add('hidden');
                buttons.forEach(btn => { btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed'); });
            }
        }

        function handleError(error, username) {
            console.error(`Error for user ${username}:`, error);
            welcomeScreen.classList.remove('hidden');
            rosterView.classList.add('hidden');
            playerListView.classList.add('hidden');
            welcomeScreen.innerHTML = `<h2 class="text-red-400">Error</h2><p>Could not fetch data for user: ${username}</p><p>${error.message}</p>`;
        }

        async function fetchWithCache(url) {
            if (state.cache[url]) return state.cache[url];
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
            const data = await response.json();
            state.cache[url] = data;
            return data;
        }