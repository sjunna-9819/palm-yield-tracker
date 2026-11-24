import './style.css';
import '@fontsource/barlow/400.css'; import '@fontsource/barlow/500.css'; import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css'; import '@fontsource/barlow-condensed/600.css'; import '@fontsource/barlow-condensed/700.css';
import '@fontsource/mandali/400.css';
import qrcode from 'qrcode-generator';
import { jsPDF } from 'jspdf';
import { claude, scanTag, getLocation, watchLocation, localData, isShared, uploadLocal } from './platform.js';
import { initSurvey, showSurvey, refreshBlocks, averageGps } from './survey.js';
(() => {
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* fruit stages, in growth order. dev = counts as developing on the palm. */
const STAGES = [
  { k: 'fl', code: 'F', css: '--st-fl', dev: false },
  { k: 'fs', code: 'B1', css: '--st-fs', dev: true },
  { k: 'yg', code: 'B2', css: '--st-yg', dev: true },
  { k: 'bk', code: 'B3', css: '--st-bk', dev: true },
  { k: 'tn', code: 'B4', css: '--st-tn', dev: true },
  { k: 'rp', code: 'B5', css: '--st-rp', dev: true },
  { k: 'ov', code: 'OR', css: '--st-ov', dev: false },
  { k: 'ab', code: 'AB', css: '--st-ab', dev: false }
];

/* ---------- language ---------- */
const T = {
 en: {
  guideBtn:'Guide', openPalm:'Open a palm', block:'Block', openBtn:'Open palm',
  scanHint:'Or tap Scan tag and point the camera at the QR code on the palm.', scanBtn:'Scan tag', scanNone:'No palm tag found in that code.', gpsTitle:'Location', gpsBtn:'Save GPS here', gpsWorking:'Getting GPS… ±{0} m', gpsNone:'No GPS saved yet. Stand at the trunk and tap Save GPS here.', gpsSaved:'GPS saved ±{0} m ({1})', gpsFail:'Could not get GPS. Turn on location and try in the open.', gpsCount:'GPS saved for {0} of {1} palms', gpsExport:'Export GPS (CSV)', gpsImprove:'Add another GPS reading here', gpsSavedN:'GPS saved ±{0} m from {2} readings ({1})', gpsFar:'This reading is {0} m from the saved spot, so it was not added. Check the tag number. Tap again to replace the saved spot.', gpsReplaced:'Saved spot replaced.', nearBtn:'Find palm by GPS', nearStop:'Stop GPS find', nearWait:'Getting GPS…', nearNone:'No palms have GPS yet. Stand at a palm and scan its tag once: its spot is saved when you save the count.', nearAcc:'GPS ±{0} m', nearClose:'Nearest palms. Walk within 2.5 m (8 ft) and the palm opens by itself:', nearWeak:'GPS is ±{0} m here, too weak to pick a palm by itself. Tap the palm below or scan its tag.', nearOpened:'{0} opened by GPS ({1} m away)', pendingSync:'Saved on this phone. Will sync when there is signal.', syncErr:'A save was rejected by the server. Check your access.',
  countedToday:'Counted today', thisMonth:'This month', forecast:'Bunches coming (estimate)',
  fcNote:'Based on the latest count of each palm. Stage timings vary with season, water and palm age.',
  stagesByMonth:'Bunches on palms, by month', ovTitle:'Overripe bunches seen', ovHint:'These palms had overripe or rotten bunches. The harvest round is running late there.',
  weak:'Weakest palms', weakHint:'Bottom 10% by average developing bunches. Shows after 2 months of counts. Check for disease, water or long male phases.',
  notCounted:'Not counted this month', palmMap:'Palm map', labels:'QR tags', labelsHint:'Makes a PDF of tags, 21 per A4 page. Print on weatherproof sticker sheets or laminate.',
  makeLabels:'Make tag PDF', addTicket:'Add mill ticket', date:'Date', tonnes:'Weight (tonnes)', tkBunches:'Bunches in load', ticketNo:'Ticket no.',
  saveTicket:'Save ticket', tickets:'Mill tickets', setup:'Farm setup', farmNameL:'Farm name', blockId:'Block', acres:'Acres',
  palms:'Palms', planted:'Planted (year)', addBlock:'Add block', saveSetup:'Save setup',
  setupHint:'Palm numbers run 1 to the palm count in each block. Tag IDs look like B01-0001.',
  tgOpen:'Tag palms with GPS', tgMark:'Mark location here', tgSkip:'Skip to next untagged', tgClear:'Remove saved spot', tgMapT:'Tagged palms', tgMapHint:'Green dots are tagged palms, the orange one is the palm selected above, blue is you. Tap a dot to select it.',
  tgListT:'All palms', tgLegTag:'tagged', tgLegNo:'not tagged', tgLegCur:'selected', tgCount:'{0} of {1} palms tagged', tgTagged:'Tagged ±{0} m', tgNot:'Not tagged yet',
  tgAway:'You are {0} m from this palm’s saved spot.', tgNearest:'Nearest tagged palm: {0}, {1} m away.', tgStand:'Stand at the trunk of {0}', tgSaved:'{0} tagged (±{1} m)', tgAveraged:'{0}: reading added, now ±{1} m',
  tgFarAsk:'This reading is {0} m from where {1} was saved before. Replace the saved spot?', tgReplace:'Replace', tgClearAsk:'Remove the saved GPS spot of {0}?', tgAll:'Every palm in this block is tagged.', tgMapEmpty:'No palms tagged yet',
  fieldTools:'Field survey and 3D', svOpen:'Survey rows with GPS', farm1_3d:'Farm 1 in 3D', farm2_3d:'Farm 2 in 3D', fieldToolsHint:'Survey: mark trees with GPS row by row. The 3D farms place palms from the survey of the block shown on the map above.',
  svBack:'‹ Palms', svIntro:'Quick way: mark the first and last tree of a row and set how many trees are in it; the trees in between are placed for you. Exact way: "Mark trees one by one". You can mix both. Stand still at the trunk while it reads GPS.',
  svAdd:'+ Add row', svMapT:'Survey map', svApply:'Use for palm map', svExportB:'Export survey (JSON)', svApplyHint:'"Use for palm map" sets this block\'s rows and GPS positions, so palm numbers run row by row (row 1 first). Owner only.',
  svGpsOff:'GPS off', svStandAt:'Stand still at tree {0}', svStandFirst:'Stand still at the FIRST tree of row {0}', svStandLast:'Stand still at the LAST tree of row {0}', svCancel:'Cancel', svClose:'Close',
  svReads:'{0} readings', svWaiting:'Waiting for GPS…', svBest:'Best so far ±{0} m', svNoReading:'No GPS reading. Move into the open and try again.', svRetry:'Try again', svWorse:'is worse than {0} m',
  svWaitRetry:'Wait a little in the open and retry, or keep this reading.', svKeep:'Keep anyway', svFrom:'from {0} readings', svNext:'Next: mark {0}', svDone:'Done',
  svSavedTree:'{0} saved (±{1} m)', svSavedEnd:'Row {0}: end saved (±{1} m)', svDelAsk:'Delete row {0} and its marks?', svDelRow:'Delete row {0}',
  svFirst:'First tree', svLast:'Last tree', svNotMarked:'Not marked', svMarkFirst:'Mark first', svMarkLast:'Mark last', svRemark:'Re-mark',
  svNoBlock:'Add a block under Setup first.', svMark2:'Mark 2 trees to place the rest', svApart:'{0} m apart', svCheck:'Expected about 9 m. Check the count or re-mark a tree.',
  svRow:'Row {0}', svTrees:'Trees in this row', svShowIds:'Show {0} tree IDs, {1} GPS marked', svWalk:'Mark trees one by one', svEmpty:'No rows yet. Tap "+ Add row", walk to the first tree of row 1 and mark it.',
  svSummary:'{0} rows, {1} trees placed, {2} marked with GPS.', svGpsMarked:'GPS marked', svWorkedOut:'Worked out from marked trees', svAway:'You are {0} m from this tree.',
  svRemarkHere:'Re-mark this tree here', svMarkHere:'Mark this tree here', svRemove:'Remove this mark', svOpenMaps:'Open in Maps',
  svApplyAsk:'Set block {0} to {1} rows and {2} palms from this survey? Palm numbers will run row by row.', svMapEmpty:'No rows placed yet', layoutApplied:'Palm map updated from the survey.',
  dataTitle:'Data and backup', dataExport:'Export all data (JSON)', dataImport:'Import data file', dataUpload:'Copy this phone\'s data to the farm database',
  dataLocal:'Phone-only mode: data is saved on this phone. Export a backup now and then. Add Firebase (SETUP.md) to share between phones.', dataShared:'Shared mode: every phone that joined the farm sees the same data.',
  dataAsk:'Load {0} palms, {1} mill tickets and the farm setup from this file? Records with the same ID are replaced.', dataLoaded:'Loaded {0} records.', dataBad:'That file is not a farm data backup.',
  dataUpAsk:'Copy {0} records from this phone to the farm database?', dataUploaded:'Copied {0} records.', yes:'Yes',
  layoutTitle:'Field layout', layoutHint:'Enter how many palms are in each row, in walking order. Palm numbers then run row by row: row 1 first, then row 2, and so on. Or load the backup file from the Palm Yield Tracker to use the real GPS positions. Tap Save setup after.',
  layRows:'Palms in each row, separated by commas', layDiamond:'Diamond planting (every other row shifted half a palm)', layImport:'Load from Palm Yield Tracker backup', layClear:'Clear layout',
  layNone:'No field layout for this block yet: palms are shown in number order.', layInfo:'{0} rows, {1} palms{2}.', layGps:', GPS positions', layMismatch:'Rows add up to {0} palms but the block has {1}. Saving sets the block to {0}.',
  layLoaded:'Loaded {0} rows and {1} palms from the tracker. Tap Save setup.', layBad:'That file is not a Palm Yield Tracker backup.', layUnsaved:'Not saved yet. Tap Save setup.',
  rowTree:'Row {0}, palm {1} in the row', mapHintRows:'Each line is one field row (R1 at the top). Tap a palm to open it.', mapHintGps:'Drawn from GPS positions, north at the top. Tap a palm to open it.',
  tCount:'Count', tDash:'Dashboard', tPalms:'Palms', tMill:'Mill', tSetup:'Setup',
  month:'Month', onPalm:'Bunches on palm', tapPic:'Tap a picture to add one. Count every bunch you can see on the palm.',
  save:'Save', saveNext:'Save & next palm', palmStatus:'Palm condition', note:'Note', history:'Monthly counts',
  kCounted:'palms counted', kDev:'bunches on palms', kAvg:'per palm', kMale:'palms in male phase',
  kOv:'palms with overripe', kTacre:'t per acre, 12 months', kKg:'kg average bunch', kTonnes:'tonnes to mill, 12 months',
  fc1:'ripe within 1 month', fc2:'in 1–3 months', fc3:'in 3–6 months',
  noneToday:'Nothing counted yet today. Open a palm or scan a tag to start.', noneOv:'No overripe bunches this month.',
  weakWait:'Shows after 2 months of counts.', allCounted:'Every palm is counted this month.', noTickets:'No mill tickets yet.',
  countedOn:'Counted {0}', notYet:'Not counted this month', savedN:'{0} saved: {1} bunches', alreadyLogged:'Already counted for this month. Saving replaces it.',
  del:'Delete', undo:'Undo', undone:'Undone', numOf:'of {0}', cont:'Continue with', roundL:'Counted this month', roundOf:'{0} of {1} palms',
  fAll:'All', fNot:'Not counted', fFlagged:'Flagged', fOv:'Overripe', fMale:'Male phase',
  fDisease:'Disease / Ganoderma', fWater:'Water stress', fPest:'Pest damage', fDead:'Dead / to replace', fTag:'Tag missing',
  noConfig:'Farm not set up yet. The owner adds blocks under Setup.', signedOut:'Not connected to the farm database.',
  readOnly:'You can view records but not add them. Ask the owner for Contributor access.', slow:"Can't reach the farm records yet. Check the signal; entries will show when it connects.",
  badPalm:'There is no palm {0} in block {1}. This block has {2} palms.', badTonnes:'Enter the weight in tonnes, for example 1.25',
  ticketSaved:'Ticket saved', setupSaved:'Setup saved', saveFailed:'Could not save. Check the signal and try again.',
  makingLabels:'Making {0} tags…', labelsDone:'Tag PDF ready.', labelsNoDl:'This view cannot save files. Open the app in a browser to make tags.',
  legend0:'not counted', legend1:'0–1', legend2:'2–3', legend3:'4+', legendF:'flagged', unitT:'t', acresShort:'{0} acres · {1} palms', you:'you',
  chartEmpty:'Monthly counts appear here after the first count.', male:'male',
  stagesTitle:'Fruit stages', timelineHint:'From pollination to ripe takes about 5–6 months. A palm carries several bunches at different stages at once.',
  howTitle:'How it works', guideStart:'Start counting',
  markersL:'How to tell', drawing:'Drawing', credits:'Photo credits', ovNote:'OR (overripe) is a drawing: no free photo was available. Replace it with a photo from your own farm.', s_fl:'Female flowering', s_fs:'Fruit set', s_yg:'Green bunch', s_bk:'Black bunch', s_tn:'Turning', s_rp:'Ripe', s_ov:'Overripe / rotten', s_ab:'Aborted / dry', s_male:'Male flowers',
  w_fl:'5–6 mo to ripe', w_fs:'4–5 mo to ripe', w_yg:'2.5–4 mo to ripe', w_bk:'1–2.5 mo to ripe', w_tn:'2–4 weeks to ripe', w_rp:'Cut this round', w_ov:'Harvest is late', w_ab:'Lost bunch', w_male:'No fruit',
  a_fl:'Day 0', a_fs:'0–1.5 months', a_yg:'1.5–3 months', a_bk:'3–4.5 months', a_tn:'4.5–5 months', a_rp:'5–6 months', a_ov:'Past 6 months', a_ab:'Any age', a_male:'Any time',
  k_fl:'Cream to pink flowers, aniseed smell', k_fs:'Tiny green fruits, dry flower tips', k_yg:'Green, tightly packed, growing', k_bk:'Full size, shiny purple-black', k_tn:'Orange at the base, top still black', k_rp:'Orange-red, loose fruits on ground', k_ov:'Many loose fruits, dull or rotting', k_ab:'Small, brown, shrivelled',
  m_fl:'Sits deep in the frond base, wrapped in bracts until it opens|Cream-white flowers turn pink, then purple, over 2–3 days|Sweet aniseed smell; pollinating weevils crawl over it|Sharp spines between the flower clusters',
  m_fs:'Flowers have dried; a black-brown tip stays on top of each fruit|Tiny green fruits, pea to marble size|Bunch is fist to coconut size, still tucked in the frond base|Spines look long next to the small fruits',
  m_yg:'Grows to nearly full size and pushes out of the frond base|Fruits green to dark green, tightly packed|Cut a fruit: kernel is watery or jelly-like, no oil smear|Spines now look short next to the bunch',
  m_bk:'Full size and very heavy; fruits shiny dark purple-black|Kernel shell is hard; flesh pale yellow, oil starting|No colour at the base yet|Virescens palms stay green at this stage instead of turning black',
  m_tn:'Red-orange shows at the base or on inner fruits; top still black|Less than half of the outer fruits have coloured|No loose fruits on the ground yet|Ripe within 1–3 harvest rounds',
  m_rp:'Most outer fruits bright orange-red, black only at the tips|1 to 10 loose fruits on the ground or frond base (at least 1 loose fruit = ripe)|Fruit comes away easily when pressed|Cut this round',
  m_ov:'Many loose fruits around the palm, more than half the outer fruits fallen|Dull, darkened orange-brown; rot, mould or rat damage|Oil acidity (FFA) rises; the mill may pay less|Cut now and shorten the harvest round',
  m_ab:'Small bunch that dried before filling, brown and shrivelled|Fruits are hollow or missing|Usually after drought or over-pruning|Remove it; many aborted bunches = check water and fertiliser',
  m_male:'Long finger-like spikelets with no spines between them|Sheds yellow pollen, aniseed smell, weevils on it|Turns brown and dry after about a week|Gives no fruit; a long male phase means fewer bunches later',
  d_male_s:'M · Long finger spikes, yellow pollen, no spines. Switch on if the palm has them now.',
  g1t:'1. Tag every palm', g1d:'Nail a weatherproof tag with the palm number and a QR code to each trunk at chest height, facing the path.',
  g2t:'2. Count once a month', g2d:'Walk each palm once a month and count every bunch you can see, by stage. Harvesting still happens every 7–10 days.',
  g3t:'3. Enter it on the phone', g3d:'Type the palm number or scan the tag, tap the picture of each stage you see, then Save & next.',
  g4t:'4. Enter the mill ticket', g4d:'Type in the weight and the bunches in the load. Tonnes divided by bunches gives the average bunch weight.',
  g5t:'5. Read the dashboard', g5d:'See bunches coming in the next 1, 3 and 6 months, late harvests, and weak palms (red outline) to check or replace.'
 },
 te: {
  guideBtn:'గైడ్', openPalm:'చెట్టును తెరవండి', block:'బ్లాక్', openBtn:'చెట్టు తెరువు',
  scanHint:'లేదా "ట్యాగ్ స్కాన్" నొక్కి చెట్టు మీది QR కోడ్ వైపు కెమెరా చూపించండి.', scanBtn:'ట్యాగ్ స్కాన్', scanNone:'ఆ కోడ్‌లో చెట్టు ట్యాగ్ లేదు.', gpsTitle:'స్థానం', gpsBtn:'ఇక్కడ GPS సేవ్ చేయి', gpsWorking:'GPS తీసుకుంటోంది… ±{0} మీ', gpsNone:'ఇంకా GPS సేవ్ కాలేదు. కాండం దగ్గర నిలబడి "ఇక్కడ GPS సేవ్ చేయి" నొక్కండి.', gpsSaved:'GPS సేవ్ అయింది ±{0} మీ ({1})', gpsFail:'GPS రాలేదు. లొకేషన్ ఆన్ చేసి ఖాళీ ప్రదేశంలో ప్రయత్నించండి.', gpsCount:'{1} లో {0} చెట్లకు GPS ఉంది', gpsExport:'GPS ఎగుమతి (CSV)', gpsImprove:'ఇక్కడ మరో GPS రీడింగ్ జోడించు', gpsSavedN:'GPS సేవ్ అయింది ±{0} మీ, {2} రీడింగ్‌లు ({1})', gpsFar:'ఈ రీడింగ్ సేవ్ అయిన స్థానానికి {0} మీ దూరంలో ఉంది, జోడించలేదు. ట్యాగ్ నంబర్ చూడండి. స్థానం మార్చాలంటే మళ్ళీ నొక్కండి.', gpsReplaced:'సేవ్ అయిన స్థానం మార్చబడింది.', nearBtn:'GPS తో చెట్టు కనుగొను', nearStop:'GPS వెతుకుట ఆపు', nearWait:'GPS తీసుకుంటోంది…', nearNone:'ఇంకా ఏ చెట్టుకూ GPS లేదు. చెట్టు దగ్గర నిలబడి దాని ట్యాగ్ ఒకసారి స్కాన్ చేయండి: లెక్క సేవ్ చేసినప్పుడు స్థానం సేవ్ అవుతుంది.', nearAcc:'GPS ±{0} మీ', nearClose:'దగ్గరి చెట్లు. 2.5 మీ (8 అడుగులు) లోపలికి వెళ్తే చెట్టు తానే తెరుచుకుంటుంది:', nearWeak:'ఇక్కడ GPS ±{0} మీ, చెట్టును తానే ఎంచడానికి బలహీనంగా ఉంది. కింద చెట్టును నొక్కండి లేదా ట్యాగ్ స్కాన్ చేయండి.', nearOpened:'{0} GPS తో తెరుచుకుంది ({1} మీ దూరం)', pendingSync:'ఈ ఫోన్‌లో సేవ్ అయింది. సిగ్నల్ రాగానే సింక్ అవుతుంది.', syncErr:'ఒక సేవ్‌ను సర్వర్ తిరస్కరించింది. మీ యాక్సెస్ చూడండి.',
  countedToday:'ఈ రోజు లెక్కించినవి', thisMonth:'ఈ నెల', forecast:'రాబోయే గెలలు (అంచనా)',
  fcNote:'ప్రతి చెట్టు చివరి లెక్క ఆధారంగా. దశల సమయం కాలం, నీరు, చెట్టు వయసును బట్టి మారుతుంది.',
  stagesByMonth:'చెట్ల మీద గెలలు, నెలవారీగా', ovTitle:'అతిగా పండిన గెలలు కనిపించినవి', ovHint:'ఈ చెట్లకు అతిగా పండిన లేదా కుళ్ళిన గెలలు ఉన్నాయి. అక్కడ కోత ఆలస్యమవుతోంది.',
  weak:'బలహీనమైన చెట్లు', weakHint:'సగటు గెలలలో కింది 10%. 2 నెలల లెక్కల తర్వాత కనిపిస్తుంది. తెగులు, నీరు, ఎక్కువ కాలం మగ పూత ఉన్నాయేమో చూడండి.',
  notCounted:'ఈ నెల లెక్కించనివి', palmMap:'చెట్ల మ్యాప్', labels:'QR ట్యాగ్‌లు', labelsHint:'ట్యాగ్‌ల PDF తయారవుతుంది, ఒక A4 పేజీకి 21. వాటర్‌ప్రూఫ్ స్టిక్కర్ మీద ప్రింట్ చేయండి లేదా లామినేట్ చేయండి.',
  makeLabels:'ట్యాగ్ PDF తయారు చేయి', addTicket:'మిల్లు టికెట్ జోడించు', date:'తేదీ', tonnes:'బరువు (టన్నులు)', tkBunches:'లోడ్‌లో గెలలు', ticketNo:'టికెట్ నంబర్',
  saveTicket:'టికెట్ సేవ్ చేయి', tickets:'మిల్లు టికెట్లు', setup:'తోట వివరాలు', farmNameL:'తోట పేరు', blockId:'బ్లాక్', acres:'ఎకరాలు',
  palms:'చెట్లు', planted:'నాటిన సంవత్సరం', addBlock:'బ్లాక్ జోడించు', saveSetup:'సేవ్ చేయి',
  setupHint:'ప్రతి బ్లాక్‌లో చెట్లకు 1 నుండి నంబర్లు. ట్యాగ్ ID ఇలా ఉంటుంది: B01-0001.',
  tgOpen:'GPS తో చెట్లకు గుర్తు', tgMark:'ఇక్కడ స్థానం గుర్తు పెట్టు', tgSkip:'తర్వాత గుర్తు లేని చెట్టు', tgClear:'సేవ్ అయిన స్థానం తీసివేయి', tgMapT:'గుర్తు ఉన్న చెట్లు', tgMapHint:'ఆకుపచ్చ చుక్కలు గుర్తు ఉన్న చెట్లు, నారింజ రంగు పైన ఎంచిన చెట్టు, నీలం మీరు. ఎంచడానికి చుక్కను నొక్కండి.',
  tgListT:'అన్ని చెట్లు', tgLegTag:'గుర్తు ఉంది', tgLegNo:'గుర్తు లేదు', tgLegCur:'ఎంచినది', tgCount:'{1} లో {0} చెట్లకు గుర్తు', tgTagged:'గుర్తు ఉంది ±{0} మీ', tgNot:'ఇంకా గుర్తు లేదు',
  tgAway:'ఈ చెట్టు సేవ్ అయిన స్థానానికి మీరు {0} మీ దూరంలో ఉన్నారు.', tgNearest:'దగ్గరి గుర్తు ఉన్న చెట్టు: {0}, {1} మీ దూరం.', tgStand:'{0} కాండం దగ్గర నిలబడండి', tgSaved:'{0} గుర్తు సేవ్ అయింది (±{1} మీ)', tgAveraged:'{0}: రీడింగ్ జోడించాం, ఇప్పుడు ±{1} మీ',
  tgFarAsk:'ఈ రీడింగ్ {1} ముందు సేవ్ అయిన చోటుకు {0} మీ దూరంలో ఉంది. స్థానం మార్చాలా?', tgReplace:'మార్చు', tgClearAsk:'{0} GPS స్థానం తీసివేయాలా?', tgAll:'ఈ బ్లాక్‌లో అన్ని చెట్లకు గుర్తు ఉంది.', tgMapEmpty:'ఇంకా ఏ చెట్టుకూ గుర్తు లేదు',
  fieldTools:'సర్వే మరియు 3D', svOpen:'GPS తో వరుసల సర్వే', farm1_3d:'తోట 1 3D లో', farm2_3d:'తోట 2 3D లో', fieldToolsHint:'సర్వే: వరుస వారీగా చెట్లకు GPS గుర్తు పెట్టండి. 3D తోటలు పై మ్యాప్‌లో చూపిన బ్లాక్ సర్వే నుండి చెట్లను పెడతాయి.',
  svBack:'‹ చెట్లు', svIntro:'త్వరగా: వరుసలో మొదటి, చివరి చెట్టుకు గుర్తు పెట్టి, ఎన్ని చెట్లో రాయండి; మధ్యవి తానే వస్తాయి. ఖచ్చితంగా: "ఒక్కో చెట్టుకు గుర్తు". రెండూ కలిపి వాడవచ్చు. GPS చదివేటప్పుడు కాండం దగ్గర కదలకుండా నిలబడండి.',
  svAdd:'+ వరుస జోడించు', svMapT:'సర్వే మ్యాప్', svApply:'చెట్ల మ్యాప్‌కు వాడు', svExportB:'సర్వే ఎగుమతి (JSON)', svApplyHint:'"చెట్ల మ్యాప్‌కు వాడు" ఈ బ్లాక్ వరుసలు, GPS స్థానాలు సెట్ చేస్తుంది; చెట్ల నంబర్లు వరుస 1 నుండి వస్తాయి. యజమానికి మాత్రమే.',
  svGpsOff:'GPS ఆఫ్', svStandAt:'{0} చెట్టు దగ్గర కదలకుండా నిలబడండి', svStandFirst:'వరుస {0} లో మొదటి చెట్టు దగ్గర నిలబడండి', svStandLast:'వరుస {0} లో చివరి చెట్టు దగ్గర నిలబడండి', svCancel:'రద్దు', svClose:'మూసివేయి',
  svReads:'{0} రీడింగ్‌లు', svWaiting:'GPS కోసం ఎదురు చూస్తోంది…', svBest:'ఇప్పటివరకు ±{0} మీ', svNoReading:'GPS రాలేదు. ఖాళీ ప్రదేశానికి వెళ్ళి మళ్ళీ ప్రయత్నించండి.', svRetry:'మళ్ళీ ప్రయత్నించు', svWorse:'{0} మీ కంటే ఎక్కువ',
  svWaitRetry:'ఖాళీ ప్రదేశంలో కొద్దిసేపు ఆగి మళ్ళీ ప్రయత్నించండి, లేదా ఇదే ఉంచండి.', svKeep:'ఇదే ఉంచు', svFrom:'{0} రీడింగ్‌ల నుండి', svNext:'తర్వాత: {0}', svDone:'అయింది',
  svSavedTree:'{0} సేవ్ అయింది (±{1} మీ)', svSavedEnd:'వరుస {0}: చివర సేవ్ అయింది (±{1} మీ)', svDelAsk:'వరుస {0} ను తీసివేయాలా?', svDelRow:'వరుస {0} తీసివేయి',
  svFirst:'మొదటి చెట్టు', svLast:'చివరి చెట్టు', svNotMarked:'గుర్తు లేదు', svMarkFirst:'మొదటిది గుర్తు', svMarkLast:'చివరిది గుర్తు', svRemark:'మళ్ళీ గుర్తు',
  svNoBlock:'ముందు సెటప్‌లో బ్లాక్ జోడించండి.', svMark2:'మిగతావి పెట్టడానికి 2 చెట్లకు గుర్తు పెట్టండి', svApart:'{0} మీ దూరం', svCheck:'సుమారు 9 మీ ఉండాలి. లెక్క చూడండి లేదా మళ్ళీ గుర్తు పెట్టండి.',
  svRow:'వరుస {0}', svTrees:'ఈ వరుసలో చెట్లు', svShowIds:'{0} చెట్ల IDలు, {1} GPS గుర్తు', svWalk:'ఒక్కో చెట్టుకు గుర్తు', svEmpty:'ఇంకా వరుసలు లేవు. "+ వరుస జోడించు" నొక్కి వరుస 1 మొదటి చెట్టుకు గుర్తు పెట్టండి.',
  svSummary:'{0} వరుసలు, {1} చెట్లు, {2} GPS గుర్తుతో.', svGpsMarked:'GPS గుర్తు ఉంది', svWorkedOut:'గుర్తు ఉన్న చెట్ల నుండి లెక్కించింది', svAway:'మీరు ఈ చెట్టుకు {0} మీ దూరంలో ఉన్నారు.',
  svRemarkHere:'ఇక్కడ మళ్ళీ గుర్తు', svMarkHere:'ఈ చెట్టుకు ఇక్కడ గుర్తు', svRemove:'గుర్తు తీసివేయి', svOpenMaps:'మ్యాప్స్‌లో తెరువు',
  svApplyAsk:'ఈ సర్వే నుండి బ్లాక్ {0} ను {1} వరుసలు, {2} చెట్లుగా సెట్ చేయాలా? చెట్ల నంబర్లు వరుస వారీగా వస్తాయి.', svMapEmpty:'ఇంకా వరుసలు లేవు', layoutApplied:'సర్వే నుండి చెట్ల మ్యాప్ మారింది.',
  dataTitle:'డేటా మరియు బ్యాకప్', dataExport:'మొత్తం డేటా ఎగుమతి (JSON)', dataImport:'డేటా ఫైల్ దిగుమతి', dataUpload:'ఈ ఫోన్ డేటాను తోట డేటాబేస్‌కు కాపీ చేయి',
  dataLocal:'ఫోన్ మాత్రమే: డేటా ఈ ఫోన్‌లోనే ఉంటుంది. అప్పుడప్పుడు బ్యాకప్ ఎగుమతి చేయండి. ఫోన్ల మధ్య పంచుకోవడానికి Firebase జోడించండి (SETUP.md).', dataShared:'పంచుకునే విధానం: తోటలో చేరిన ప్రతి ఫోన్‌కు ఒకే డేటా కనిపిస్తుంది.',
  dataAsk:'ఈ ఫైల్ నుండి {0} చెట్లు, {1} మిల్ టికెట్లు, తోట సెటప్ లోడ్ చేయాలా? ఒకే ID ఉన్నవి మారతాయి.', dataLoaded:'{0} రికార్డులు లోడ్ అయ్యాయి.', dataBad:'ఇది తోట డేటా బ్యాకప్ కాదు.',
  dataUpAsk:'ఈ ఫోన్ నుండి {0} రికార్డులు తోట డేటాబేస్‌కు కాపీ చేయాలా?', dataUploaded:'{0} రికార్డులు కాపీ అయ్యాయి.', yes:'అవును',
  layoutTitle:'పొలం వరుసలు', layoutHint:'ప్రతి వరుసలో ఎన్ని చెట్లు ఉన్నాయో నడిచే క్రమంలో రాయండి. చెట్ల నంబర్లు వరుస 1 నుండి మొదలై వరుసగా వస్తాయి. లేదా Palm Yield Tracker బ్యాకప్ ఫైల్ లోడ్ చేస్తే అసలు GPS స్థానాలు వస్తాయి. తర్వాత సెటప్ సేవ్ చేయండి.',
  layRows:'ప్రతి వరుసలో చెట్లు, కామాలతో', layDiamond:'డైమండ్ పద్ధతి (ప్రతి రెండో వరుస సగం చెట్టు జరిగి ఉంటుంది)', layImport:'Palm Yield Tracker బ్యాకప్ లోడ్ చేయండి', layClear:'వరుసలు తీసివేయండి',
  layNone:'ఈ బ్లాక్‌కు ఇంకా వరుసలు లేవు: చెట్లు నంబర్ క్రమంలో చూపిస్తున్నాం.', layInfo:'{0} వరుసలు, {1} చెట్లు{2}.', layGps:', GPS స్థానాలు', layMismatch:'వరుసల మొత్తం {0} చెట్లు, కానీ బ్లాక్‌లో {1}. సేవ్ చేస్తే బ్లాక్ {0} అవుతుంది.',
  layLoaded:'ట్రాకర్ నుండి {0} వరుసలు, {1} చెట్లు వచ్చాయి. సెటప్ సేవ్ చేయండి.', layBad:'ఇది Palm Yield Tracker బ్యాకప్ కాదు.', layUnsaved:'ఇంకా సేవ్ కాలేదు. సెటప్ సేవ్ చేయండి.',
  rowTree:'వరుస {0}, ఆ వరుసలో {1}వ చెట్టు', mapHintRows:'ప్రతి లైన్ ఒక పొలం వరుస (పైన R1). చెట్టును తట్టి తెరవండి.', mapHintGps:'GPS స్థానాల నుండి, పైన ఉత్తరం. చెట్టును తట్టి తెరవండి.',
  tCount:'లెక్క', tDash:'డాష్‌బోర్డ్', tPalms:'చెట్లు', tMill:'మిల్లు', tSetup:'సెటప్',
  month:'నెల', onPalm:'చెట్టు మీద గెలలు', tapPic:'బొమ్మ నొక్కితే ఒకటి కలుస్తుంది. చెట్టు మీద కనిపించే ప్రతి గెలను లెక్కించండి.',
  save:'సేవ్', saveNext:'సేవ్ చేసి తదుపరి చెట్టు', palmStatus:'చెట్టు పరిస్థితి', note:'గమనిక', history:'నెలవారీ లెక్కలు',
  kCounted:'చెట్లు లెక్కించారు', kDev:'చెట్ల మీద గెలలు', kAvg:'ఒక్కో చెట్టుకు', kMale:'మగ పూత దశలో చెట్లు',
  kOv:'అతిగా పండినవి ఉన్న చెట్లు', kTacre:'టన్నులు / ఎకరం, 12 నెలలు', kKg:'కిలోలు, సగటు గెల', kTonnes:'మిల్లుకు టన్నులు, 12 నెలలు',
  fc1:'1 నెలలో పండేవి', fc2:'1–3 నెలల్లో', fc3:'3–6 నెలల్లో',
  noneToday:'ఈ రోజు ఇంకా ఏదీ లెక్కించలేదు. చెట్టు తెరవండి లేదా ట్యాగ్ స్కాన్ చేయండి.', noneOv:'ఈ నెల అతిగా పండిన గెలలు లేవు.',
  weakWait:'2 నెలల లెక్కల తర్వాత కనిపిస్తుంది.', allCounted:'ఈ నెల అన్ని చెట్లూ లెక్కించారు.', noTickets:'ఇంకా మిల్లు టికెట్లు లేవు.',
  countedOn:'{0} న లెక్కించారు', notYet:'ఈ నెల ఇంకా లెక్కించలేదు', savedN:'{0} సేవ్ అయింది: {1} గెలలు', alreadyLogged:'ఈ నెల ఇప్పటికే లెక్కించారు. సేవ్ చేస్తే మారుతుంది.',
  del:'తొలగించు', undo:'రద్దు', undone:'రద్దు అయింది', numOf:'/ {0}', cont:'కొనసాగించు', roundL:'ఈ నెల లెక్కించినవి', roundOf:'{1} లో {0} చెట్లు',
  fAll:'అన్నీ', fNot:'లెక్కించనివి', fFlagged:'సమస్య ఉన్నవి', fOv:'అతిగా పండినవి', fMale:'మగ పూత',
  fDisease:'తెగులు / గానోడెర్మా', fWater:'నీటి కొరత', fPest:'పురుగు నష్టం', fDead:'చనిపోయింది / మార్చాలి', fTag:'ట్యాగ్ లేదు',
  noConfig:'తోట వివరాలు ఇంకా లేవు. యజమాని సెటప్‌లో బ్లాక్‌లు జోడించాలి.', signedOut:'తోట డేటాబేస్‌కు కనెక్ట్ కాలేదు.',
  readOnly:'మీరు చూడగలరు కానీ నమోదు చేయలేరు. యజమానిని Contributor యాక్సెస్ అడగండి.', slow:'తోట రికార్డులు ఇంకా అందడం లేదు. సిగ్నల్ చూడండి; కనెక్ట్ అయ్యాక కనిపిస్తాయి.',
  badPalm:'బ్లాక్ {1} లో చెట్టు {0} లేదు. ఈ బ్లాక్‌లో {2} చెట్లు ఉన్నాయి.', badTonnes:'బరువు టన్నులలో ఇవ్వండి, ఉదా: 1.25',
  ticketSaved:'టికెట్ సేవ్ అయింది', setupSaved:'సెటప్ సేవ్ అయింది', saveFailed:'సేవ్ కాలేదు. సిగ్నల్ చూసి మళ్ళీ ప్రయత్నించండి.',
  makingLabels:'{0} ట్యాగ్‌లు తయారవుతున్నాయి…', labelsDone:'ట్యాగ్ PDF సిద్ధం.', labelsNoDl:'ఇక్కడ ఫైల్ సేవ్ కాదు. ట్యాగ్‌ల కోసం బ్రౌజర్‌లో తెరవండి.',
  legend0:'లెక్కించలేదు', legend1:'0–1', legend2:'2–3', legend3:'4+', legendF:'సమస్య ఉంది', unitT:'టన్ను', acresShort:'{0} ఎకరాలు · {1} చెట్లు', you:'మీరు',
  chartEmpty:'మొదటి లెక్క తర్వాత నెలవారీ లెక్కలు ఇక్కడ కనిపిస్తాయి.', male:'మగ పూత',
  stagesTitle:'గెల దశలు', timelineHint:'పరాగసంపర్కం నుండి పండడానికి సుమారు 5–6 నెలలు పడుతుంది. ఒకే చెట్టు మీద వేర్వేరు దశల్లో చాలా గెలలు ఉంటాయి.',
  howTitle:'ఎలా పనిచేస్తుంది', guideStart:'లెక్క మొదలుపెట్టండి',
  markersL:'ఎలా గుర్తించాలి', drawing:'బొమ్మ', credits:'ఫోటో క్రెడిట్స్', ovNote:'OR (అతిగా పండిన) బొమ్మ మాత్రమే: ఉచిత ఫోటో దొరకలేదు. మీ తోట ఫోటోతో మార్చండి.', s_fl:'ఆడ పూత', s_fs:'కాయ కట్టడం', s_yg:'పచ్చ గెల', s_bk:'నల్ల గెల', s_tn:'రంగు మారుతోంది', s_rp:'పండిన గెల', s_ov:'అతిగా పండిన / కుళ్ళిన', s_ab:'ఎండిపోయిన గెల', s_male:'మగ పూత',
  w_fl:'పండడానికి 5–6 నెలలు', w_fs:'పండడానికి 4–5 నెలలు', w_yg:'పండడానికి 2.5–4 నెలలు', w_bk:'పండడానికి 1–2.5 నెలలు', w_tn:'2–4 వారాల్లో పండుతుంది', w_rp:'ఈ రౌండ్‌లో కోయాలి', w_ov:'కోత ఆలస్యం', w_ab:'నష్టపోయిన గెల', w_male:'కాయలు రావు',
  a_fl:'రోజు 0', a_fs:'0–1.5 నెలలు', a_yg:'1.5–3 నెలలు', a_bk:'3–4.5 నెలలు', a_tn:'4.5–5 నెలలు', a_rp:'5–6 నెలలు', a_ov:'6 నెలలు దాటింది', a_ab:'ఏ వయసులోనైనా', a_male:'ఎప్పుడైనా',
  k_fl:'క్రీమ్ నుండి గులాబీ పూలు, సోంపు వాసన', k_fs:'చిన్న పచ్చ కాయలు, ఎండిన పూల కొనలు', k_yg:'పచ్చగా, దట్టంగా, పెరుగుతోంది', k_bk:'పూర్తి సైజు, మెరిసే ఊదా-నలుపు', k_tn:'కింద నారింజ, పైన ఇంకా నలుపు', k_rp:'నారింజ-ఎరుపు, నేల మీద రాలిన కాయలు', k_ov:'చాలా రాలిన కాయలు, మసకబారిన / కుళ్ళిన', k_ab:'చిన్నది, గోధుమ రంగు, ముడుచుకుపోయింది',
  m_fl:'ఆకు మట్టల మధ్య లోతుగా ఉంటుంది, విచ్చుకునే వరకు పొరలతో కప్పి ఉంటుంది|క్రీమ్-తెలుపు పూలు 2–3 రోజుల్లో గులాబీ, తర్వాత ఊదా రంగుకు మారతాయి|తియ్యటి సోంపు వాసన; పరాగసంపర్క పురుగులు (వీవిల్స్) తిరుగుతుంటాయి|పూల గుత్తుల మధ్య పదునైన ముళ్ళు',
  m_fs:'పూలు ఎండిపోయాయి; ప్రతి కాయ పైన నలుపు-గోధుమ కొన మిగిలి ఉంటుంది|చిన్న పచ్చ కాయలు, బఠాణీ నుండి గోలీ సైజు|గెల పిడికిలి నుండి కొబ్బరికాయ సైజు, ఇంకా మట్ట మధ్యలోనే|చిన్న కాయలతో పోలిస్తే ముళ్ళు పొడవుగా కనిపిస్తాయి',
  m_yg:'దాదాపు పూర్తి సైజుకు పెరిగి మట్ట నుండి బయటకు వస్తుంది|కాయలు పచ్చ నుండి ముదురు పచ్చ, దట్టంగా అతుక్కుని|కాయ కోసి చూస్తే గింజ నీళ్ళలా లేదా జెల్లీలా, నూనె మరక ఉండదు|గెలతో పోలిస్తే ముళ్ళు చిన్నగా కనిపిస్తాయి',
  m_bk:'పూర్తి సైజు, చాలా బరువు; కాయలు మెరిసే ముదురు ఊదా-నలుపు|గింజ పెంకు గట్టిపడింది; గుజ్జు లేత పసుపు, నూనె మొదలవుతోంది|కింది భాగంలో ఇంకా రంగు రాలేదు|వైరెసెన్స్ రకం చెట్లలో ఈ దశలో నలుపు కాకుండా పచ్చగానే ఉంటాయి',
  m_tn:'కింది భాగంలో లేదా లోపలి కాయల్లో ఎరుపు-నారింజ; పైన ఇంకా నలుపు|బయటి కాయల్లో సగం కంటే తక్కువ రంగు మారాయి|నేల మీద ఇంకా రాలిన కాయలు లేవు|1–3 కోత రౌండ్లలో పండుతుంది',
  m_rp:'బయటి కాయలు చాలావరకు ప్రకాశవంతమైన నారింజ-ఎరుపు, కొనల దగ్గర మాత్రమే నలుపు|నేల మీద లేదా మట్ట దగ్గర 1 నుండి 10 రాలిన కాయలు (కనీసం 1 రాలిన కాయ = పండినట్లు)|నొక్కితే కాయ సులభంగా ఊడి వస్తుంది|ఈ రౌండ్‌లోనే కోయాలి',
  m_ov:'చెట్టు చుట్టూ చాలా రాలిన కాయలు, బయటి కాయల్లో సగం పైగా రాలాయి|రంగు మసకబారి ముదురు నారింజ-గోధుమ; కుళ్ళు, బూజు లేదా ఎలుకల నష్టం|నూనెలో ఆమ్లత్వం (FFA) పెరుగుతుంది; మిల్లు తక్కువ ధర ఇవ్వవచ్చు|వెంటనే కోసి, కోత రౌండ్ వ్యవధి తగ్గించండి',
  m_ab:'నిండక ముందే ఎండిపోయిన చిన్న గెల, గోధుమ రంగు, ముడుచుకుపోయింది|కాయలు ఖాళీగా ఉంటాయి లేదా ఉండవు|ఎక్కువగా నీటి కొరత లేదా ఎక్కువ మట్టలు కొట్టిన తర్వాత వస్తుంది|తీసేయండి; ఎండిన గెలలు ఎక్కువైతే నీరు, ఎరువులు చూడండి',
  m_male:'పొడవైన వేళ్ళలాంటి కొమ్మలు, మధ్యలో ముళ్ళు ఉండవు|పసుపు పుప్పొడి రాలుస్తుంది, సోంపు వాసన, పురుగులు ఉంటాయి|సుమారు వారం తర్వాత గోధుమ రంగులో ఎండిపోతుంది|కాయలు రావు; ఎక్కువ కాలం మగ పూత అంటే తర్వాత తక్కువ గెలలు',
  d_male_s:'M · పొడవైన వేళ్ళలాంటి కొమ్మలు, పసుపు పుప్పొడి, ముళ్ళు ఉండవు. చెట్టుకు ఇప్పుడు ఉంటే ఆన్ చేయండి.',
  g1t:'1. ప్రతి చెట్టుకు ట్యాగ్', g1d:'చెట్టు నంబర్, QR కోడ్ ఉన్న వాటర్‌ప్రూఫ్ ట్యాగ్‌ను ప్రతి కాండానికి ఛాతీ ఎత్తులో, దారి వైపు మేకుతో కొట్టండి.',
  g2t:'2. నెలకు ఒకసారి లెక్క', g2d:'నెలకు ఒకసారి ప్రతి చెట్టు దగ్గరకు వెళ్ళి కనిపించే ప్రతి గెలను దశల వారీగా లెక్కించండి. కోత మాత్రం 7–10 రోజులకు ఒకసారి జరుగుతుంది.',
  g3t:'3. ఫోన్‌లో నమోదు', g3d:'చెట్టు నంబర్ టైప్ చేయండి లేదా ట్యాగ్ స్కాన్ చేయండి, కనిపించిన ప్రతి దశ బొమ్మను నొక్కి "సేవ్ చేసి తదుపరి" నొక్కండి.',
  g4t:'4. మిల్లు టికెట్ నమోదు', g4d:'బరువు, లోడ్‌లోని గెలల సంఖ్య ఇవ్వండి. టన్నులను గెలలతో భాగిస్తే సగటు గెల బరువు వస్తుంది.',
  g5t:'5. డాష్‌బోర్డ్ చూడండి', g5d:'రాబోయే 1, 3, 6 నెలల్లో వచ్చే గెలలు, ఆలస్యమైన కోతలు, బలహీనమైన చెట్లు (ఎరుపు అంచు) చూసి సరిచేయండి లేదా మార్చండి.'
 }
};
let LANG = 'en';
try { LANG = localStorage.getItem('pbr:lang') || 'en'; } catch {}
const t = (k, ...a) => (T[LANG][k] ?? T.en[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i]);
function applyLang() {
  document.documentElement.lang = LANG === 'te' ? 'te' : 'en';
  document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('lang-en').setAttribute('aria-pressed', LANG === 'en'); $('lang-te').setAttribute('aria-pressed', LANG === 'te');
  renderGuide();
  renderAll();
}
document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { LANG = b.dataset.lang; try { localStorage.setItem('pbr:lang', LANG); } catch {} applyLang(); renderNear(); if (lastFix) onFix(lastFix); });

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const thisMonth = () => today().slice(0, 7);
const fmtDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(LANG === 'te' ? 'te-IN' : 'en-IN', { day: 'numeric', month: 'short' }); };
const fmtMonth = s => { const [y, m] = s.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(LANG === 'te' ? 'te-IN' : 'en-IN', { month: 'short', year: 'numeric' }); };
const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const nf = (n, d = 0) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- state ---------- */
const S = { config: null, palms: {}, tickets: [], uid: null, canWrite: null, canEdit: false };
let db = null, downloads = null;
const blocks = () => (S.config && Array.isArray(S.config.blocks)) ? S.config.blocks : [];
const blockOf = id => blocks().find(b => b.id === id);
const palmId = (b, n) => `${b}-${String(n).padStart(4, '0')}`;
const parseId = s => { const m = /^([A-Za-z0-9]+)-(\d{1,5})$/.exec(s || ''); return m ? { block: m[1].toUpperCase(), n: +m[2] } : null; };
const censuses = p => Object.entries((p && p.c) || {}).map(([m, e]) => ({ m, ...e, s: e.s || {} })).sort((a, b) => a.m < b.m ? 1 : -1);
const devOf = s => STAGES.filter(x => x.dev).reduce((a, x) => a + (+s[x.k] || 0), 0);
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- toast / banner ---------- */
let toastT, toastUndo = null;
function toast(msg, undoFn) {
  $('toastMsg').textContent = msg; toastUndo = undoFn || null;
  const u = $('toastUndo'); u.hidden = !undoFn; u.textContent = t('undo');
  $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; toastUndo = null; }, undoFn ? 5000 : 2600);
}
$('toastUndo').onclick = async () => { const f = toastUndo; toastUndo = null; $('toast').hidden = true; if (f) { try { await f(); toast(t('undone')); } catch { toast(t('saveFailed')); } } };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
function banner(msg) { $('banner').textContent = msg || ''; $('banner').hidden = !msg; }

/* ---------- fruit art (canvas, seeded so each stage always looks the same) ---------- */
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function mix(a, b, f) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * f)).join(',')})`; }
/* photo-style renderer: shaded 3D fruitlets on an ellipsoid, spines, palm trunk + frond bases behind */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lc = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const sh = (c, f) => f <= 1 ? c.map(v => v * f) : c.map(v => v + (255 - v) * Math.min(1, f - 1));
const rgba = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v, 0, 255))).join(',')},${a})`;
function taper(g, x1, y1, x2, y2, w1, w2, fill) {
  const a = Math.atan2(y2 - y1, x2 - x1), px = -Math.sin(a), py = Math.cos(a);
  g.beginPath(); g.moveTo(x1 + px * w1, y1 + py * w1); g.lineTo(x2 + px * w2, y2 + py * w2); g.lineTo(x2 - px * w2, y2 - py * w2); g.lineTo(x1 - px * w1, y1 - py * w1); g.closePath();
  g.fillStyle = fill; g.fill();
}
function scene(g, W, H, r, ground) {
  let bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#46552f'); bg.addColorStop(.55, '#222b18'); bg.addColorStop(1, '#141a0e');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) { const x = r() * W, y = r() * H * .7, rr = W * (.05 + r() * .12); const rg = g.createRadialGradient(x, y, 0, x, y, rr); rg.addColorStop(0, 'rgba(190,210,140,.10)'); rg.addColorStop(1, 'rgba(190,210,140,0)'); g.fillStyle = rg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  // trunk
  const tg = g.createLinearGradient(W * .22, 0, W * .78, 0); tg.addColorStop(0, '#24190f'); tg.addColorStop(.35, '#5c4630'); tg.addColorStop(.55, '#6e5638'); tg.addColorStop(1, '#22180e');
  g.fillStyle = tg; g.fillRect(W * .22, 0, W * .56, H * .4);
  for (let i = 0; i < 160; i++) { const x = W * (.22 + r() * .56), y = r() * H * .4; g.strokeStyle = r() < .5 ? 'rgba(20,12,6,.45)' : 'rgba(170,140,95,.22)'; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * W * .05, y + W * (.02 + r() * .04)); g.stroke(); }
  const fade = g.createLinearGradient(0, H * .28, 0, H * .42); fade.addColorStop(0, 'rgba(20,26,14,0)'); fade.addColorStop(1, 'rgba(20,26,14,1)'); g.fillStyle = fade; g.fillRect(W * .2, H * .28, W * .6, H * .15);
  // frond bases (petioles) leaving the trunk
  const pet = (x1, y1, x2, y2, w) => { const pg = g.createLinearGradient(x1, y1 - w, x1, y1 + w); pg.addColorStop(0, '#9c9258'); pg.addColorStop(.5, '#7b7440'); pg.addColorStop(1, '#3f3c1f'); taper(g, x1, y1, x2, y2, w, w * .45, pg);
    g.strokeStyle = 'rgba(220,210,160,.55)'; g.lineWidth = 1.5; for (let k = 0; k < 9; k++) { const f = .2 + k * .09, x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f; g.beginPath(); g.moveTo(x, y - w * (1 - f * .5) * .9); g.lineTo(x - W * .015, y - w * (1 - f * .5) * .9 - W * .03); g.stroke(); } };
  pet(W * .4, H * .2, -W * .05, H * .02, W * .065);
  pet(W * .6, H * .22, W * 1.05, H * .05, W * .06);
  pet(W * .36, H * .34, -W * .05, H * .55, W * .055);
  if (ground) {
    const gg = g.createLinearGradient(0, H * .8, 0, H); gg.addColorStop(0, '#4b3a27'); gg.addColorStop(1, '#2c2117'); g.fillStyle = gg; g.fillRect(0, H * .8, W, H * .2);
    for (let i = 0; i < 60; i++) { g.strokeStyle = r() < .5 ? 'rgba(140,110,60,.5)' : 'rgba(70,90,40,.45)'; g.lineWidth = 1.5 + r() * 2; const x = r() * W, y = H * (.81 + r() * .18); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * W * .12, y + (r() - .5) * W * .03); g.stroke(); }
  }
}
function fruit(g, x, y, r0, ang, elong, c, b, lam, gloss, tip, tipA, out) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const ca = Math.cos(ang), sa = Math.sin(ang), dx = -.35 * r0, dy = -.45 * r0, hxp = dx * ca + dy * sa, hyp = -dx * sa + dy * ca;
  g.fillStyle = 'rgba(0,0,0,.42)'; g.beginPath(); g.ellipse(r0 * .1, r0 * .14, r0 * elong * 1.06, r0 * 1.06, 0, 0, 7); g.fill();
  const rg = g.createRadialGradient(hxp, hyp, r0 * .05, 0, 0, r0 * elong * 1.15);
  rg.addColorStop(0, rgba(sh(c, b + .35 * gloss))); rg.addColorStop(.45, rgba(sh(c, b))); rg.addColorStop(1, rgba(sh(c, b * .42)));
  g.beginPath(); g.ellipse(0, 0, r0 * elong, r0, 0, 0, 7); g.fillStyle = rg; g.fill();
  if (tip && tipA > 0) {
    g.save(); g.clip();
    const lg = g.createLinearGradient(r0 * elong * .05, 0, r0 * elong, 0); lg.addColorStop(0, rgba(tip, 0)); lg.addColorStop(.55, rgba(tip, tipA * out * .85)); lg.addColorStop(1, rgba(tip, tipA * out));
    g.fillStyle = lg; g.fillRect(-r0 * elong, -r0, r0 * elong * 2, r0 * 2);
    if (out < .8) { const cg = g.createRadialGradient(0, 0, 0, 0, 0, r0 * .7); cg.addColorStop(0, rgba(tip, tipA * (1 - out))); cg.addColorStop(1, rgba(tip, 0)); g.fillStyle = cg; g.fillRect(-r0, -r0, r0 * 2, r0 * 2); }
    g.restore();
  }
  if (gloss > 0) { g.fillStyle = `rgba(255,255,255,${(gloss * .6 * (.3 + lam)).toFixed(3)})`; g.beginPath(); g.ellipse(hxp, hyp, r0 * .28, r0 * .17, -.5, 0, 7); g.fill(); }
  g.restore();
}
function bunch(g, r, o) {
  const { cx, cy, RX, RY, n } = o, L = [-.45, -.6, .66], r0b = Math.sqrt(RX * RY / (n / 2)) * 1.12;
  // stalk up into the trunk
  taper(g, cx + RX * .05, cy - RY * .7, cx - RX * .15, cy - RY * 1.25, RX * .2, RX * .14, '#4d3d24');
  const sg = g.createRadialGradient(cx + RX * .1, cy + RY * .15, RX * .3, cx + RX * .1, cy + RY * .15, RX * 1.25); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg; g.beginPath(); g.ellipse(cx + RX * .1, cy + RY * .15, RX * 1.25, RY * 1.25, 0, 0, 7); g.fill();
  g.fillStyle = o.core || '#24180e'; g.beginPath(); g.ellipse(cx, cy, RX * .93, RY * .93, 0, 0, 7); g.fill();
  const pts = [];
  for (let i = 0; i < n; i++) { const Y = 1 - 2 * (i + .5) / n, rad = Math.sqrt(1 - Y * Y), th = i * 2.39996 + r() * .3, X = Math.cos(th) * rad, Z = Math.sin(th) * rad; pts.push([X, Y, Z, r()]); }
  pts.sort((a, b) => a[2] - b[2]);
  const spines = [];
  for (const [X, Y, Z, rr] of pts) {
    if (Z < -.25) continue;
    const x = cx + X * RX * (1 + r() * .04), y = cy + Y * RY * (1 + r() * .04), out = Math.min(1, Math.hypot(X, Y)), ang = Math.atan2(Y * RY, X * RX);
    const r0 = r0b * (.8 + .25 * Math.max(0, Z)) * (.88 + rr * .24), lam = Math.max(0, X * L[0] + Y * L[1] + Z * L[2]), b = (.32 + .8 * lam) * (.7 + .3 * Math.max(0, Z));
    const c = o.color(X, Y, Z, rr, r);
    if (c.hole) { g.fillStyle = 'rgba(22,13,7,.92)'; g.beginPath(); g.ellipse(x, y, r0 * .8, r0 * .7, ang, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,90,50,.5)'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + (r() - .5) * r0, y + (r() - .5) * r0); g.lineTo(x + (r() - .5) * r0, y + (r() - .5) * r0); g.stroke(); } continue; }
    fruit(g, x, y, r0, ang, 1 + (o.elong ?? .5) * out, c.c, b, lam, c.gloss ?? o.gloss, c.tip, c.tipA ?? 0, out);
    if (c.rot) { g.fillStyle = 'rgba(25,15,8,.7)'; g.beginPath(); g.ellipse(x + (r() - .5) * r0 * .6, y + (r() - .5) * r0 * .6, r0 * .5, r0 * .4, r(), 0, 7); g.fill(); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(225,225,210,.55)'; g.beginPath(); g.arc(x + (r() - .5) * r0, y + (r() - .5) * r0, 1.2, 0, 7); g.fill(); } }
    if (c.wrinkle) { g.strokeStyle = 'rgba(30,20,10,.55)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - r0 * .6, y + (k - 1) * r0 * .3); g.quadraticCurveTo(x, y + (k - 1) * r0 * .3 + (r() - .5) * r0 * .5, x + r0 * .6, y + (k - 1) * r0 * .3); g.stroke(); } }
    if (o.spine && out > .3 && r() < o.spine) spines.push([x, y, ang + (r() - .5) * .5, r0, out]);
  }
  for (const [x, y, a, r0, out] of spines) {
    const len = r0 * (1 + o.spineLen * (.6 + r() * .6)) * out, x1 = x + Math.cos(a) * r0 * .5, y1 = y + Math.sin(a) * r0 * .5;
    const sgr = g.createLinearGradient(x1, y1, x1 + Math.cos(a) * len, y1 + Math.sin(a) * len); sgr.addColorStop(0, '#3a2c18'); sgr.addColorStop(.4, o.spineCol); sgr.addColorStop(1, o.spineCol);
    taper(g, x1, y1, x1 + Math.cos(a) * len, y1 + Math.sin(a) * len, r0 * .1, .4, sgr);
  }
}
function loose(g, r, W, H, n, c1, c2, tip) {
  for (let i = 0; i < n; i++) { const x = W * (.08 + r() * .84), y = H * (.85 + r() * .12), r0 = W * .022;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x + 3, y + r0 * .7, r0 * 1.4, r0 * .5, 0, 0, 7); g.fill();
    fruit(g, x, y, r0, r() * 6, 1.35, lc(hx(c1), hx(c2), r()), .95, .7, .5, tip ? hx(tip) : null, .8, .9); }
}
function sheath(g, r, cx, cy, RX, RY, side) {
  const s = side, x0 = cx + s * RX * .2, y0 = cy - RY * 1.05;
  const pg = g.createLinearGradient(cx + s * RX * 1.2, 0, cx + s * RX * .3, 0); pg.addColorStop(0, '#3e2c18'); pg.addColorStop(.6, '#7a5a34'); pg.addColorStop(1, '#5a4024');
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx + s * RX * 1.45, cy - RY * .3, cx + s * RX * .75, cy + RY * 1.02);
  g.quadraticCurveTo(cx + s * RX * .95, cy, cx + s * RX * .55, cy - RY * .75); g.closePath(); g.fillStyle = pg; g.fill();
  g.strokeStyle = 'rgba(30,20,10,.55)'; g.lineWidth = 1.2;
  for (let k = 0; k < 14; k++) { const f = r(); g.beginPath(); g.moveTo(x0 + s * RX * f * .4, y0 + RY * f * .2); g.quadraticCurveTo(cx + s * RX * (1.1 + f * .25), cy - RY * .3 + f * RY * .3, cx + s * RX * (.7 + f * .15), cy + RY * (.8 + f * .2)); g.stroke(); }
}
function drawArt(cv, kind) {
  cv.width = cv.height = 480;
  const W = 480, H = 480, g = cv.getContext('2d'), r = rng({ fl: 3, fs: 29, yg: 7, bk: 11, tn: 13, rp: 17, ov: 19, ab: 31, male: 23 }[kind] || 5);
  scene(g, W, H, r, kind === 'rp' || kind === 'ov');
  const BLK = hx('#2a1a22'), PUR = hx('#43263a');
  if (kind === 'male') {
    const cx = W * .5, cy = H * .55, fingers = [];
    taper(g, cx, cy - H * .08, cx - W * .05, H * .3, W * .04, W * .03, '#4d3d24');
    for (let i = 0; i < 46; i++) { const a = Math.PI / 2 + (r() - .5) * 3.4, z = r(); fingers.push([a, z]); }
    fingers.sort((p, q) => p[1] - q[1]);
    for (const [a, z] of fingers) {
      const len = W * (.2 + r() * .1) * (.7 + z * .3), w = W * .026, x0 = cx + Math.cos(a) * W * .03, y0 = cy + Math.sin(a) * W * .03;
      g.save(); g.translate(x0, y0); g.rotate(a);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.roundRect(3, -w + 4, len, w * 2, w); g.fill();
      const dry = r() < .25, base = dry ? hx('#9a7444') : lc(hx('#d8bd6a'), hx('#e9d690'), r()), b = .55 + z * .45;
      const lg = g.createLinearGradient(0, -w, 0, w); lg.addColorStop(0, rgba(sh(base, b * 1.15))); lg.addColorStop(.35, rgba(sh(base, b * 1.25))); lg.addColorStop(1, rgba(sh(base, b * .45)));
      g.fillStyle = lg; g.beginPath(); g.roundRect(0, -w, len, w * 2, w); g.fill();
      g.fillStyle = 'rgba(70,50,20,.35)'; for (let k = 0; k < len / 5; k++) for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(6 + k * 5 + (j & 1) * 2.5, j * w * .55, 1.1, 0, 7); g.fill(); }
      g.restore();
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(250,225,110,${(.25 + r() * .5).toFixed(2)})`; g.beginPath(); g.arc(cx + (r() - .5) * W * .7, cy + (r() - .3) * H * .55, .8 + r() * 1.6, 0, 7); g.fill(); }
    return;
  }
  const S = {
    fl: { RX: .22, RY: .26, n: 170, gloss: .15, elong: .2, spine: .95, spineLen: 1.6, spineCol: '#d4c393', core: '#3a2a18',
      color: (X, Y, Z, rr) => ({ c: lc(hx('#f1e6c8'), hx('#e8c6b8'), rr), tip: lc(hx('#d07c94'), hx('#8e3c62'), rr), tipA: .95 }) },
    fs: { RX: .15, RY: .17, n: 120, gloss: .3, elong: .35, spine: .9, spineLen: 1.5, spineCol: '#d8c79a', core: '#2e2414',
      color: (X, Y, Z, rr) => ({ c: lc(hx('#b9cd7e'), hx('#8eaa4c'), rr), tip: hx('#33210f'), tipA: 1 }) },
    yg: { RX: .27, RY: .31, n: 240, gloss: .45, elong: .5, spine: .55, spineLen: .9, spineCol: '#c9b98a',
      color: (X, Y, Z, rr) => ({ c: lc(hx('#7ea446'), hx('#56792c'), rr), tip: hx('#33461a'), tipA: .55 }) },
    bk: { RX: .31, RY: .35, n: 290, gloss: .95, elong: .5, spine: .3, spineLen: .6, spineCol: '#b8a67a',
      color: (X, Y, Z, rr) => ({ c: lc(BLK, PUR, rr) }) },
    tn: { RX: .31, RY: .35, n: 290, gloss: .75, elong: .5, spine: .25, spineLen: .55, spineCol: '#b8a67a',
      color: (X, Y, Z, rr) => { const f = clamp(Y * 1.1 + .3 + (1 - Z) * .25 + (rr - .5) * .45, 0, 1); return { c: lc(lc(BLK, PUR, rr), lc(hx('#c8441c'), hx('#e2661f'), rr), f), tip: hx('#1d1016'), tipA: f > .25 ? .9 : 0 }; } },
    rp: { RX: .3, RY: .33, n: 280, gloss: .6, elong: .5, spine: .2, spineLen: .5, spineCol: '#b8a67a', cyF: .45,
      color: (X, Y, Z, rr, r) => r() < .06 ? { hole: true } : ({ c: rr < .2 ? hx('#c23a17') : lc(hx('#e4531b'), hx('#f2892a'), rr), tip: hx('#2a120c'), tipA: .9 }) },
    ov: { RX: .28, RY: .31, n: 250, gloss: .18, elong: .45, spine: .2, spineLen: .5, spineCol: '#9c8a64', cyF: .45,
      color: (X, Y, Z, rr, r) => r() < .32 ? { hole: true } : ({ c: lc(hx('#a8461f'), hx('#6e3016'), rr), tip: hx('#22140b'), tipA: .9, rot: r() < .22 }) },
    ab: { RX: .15, RY: .17, n: 100, gloss: .05, elong: .3, spine: .85, spineLen: 1.3, spineCol: '#a89670', core: '#2a2014',
      color: (X, Y, Z, rr, r) => r() < .25 ? { hole: true } : ({ c: lc(hx('#76654a'), hx('#4c3f2d'), rr), wrinkle: true }) }
  }[kind];
  const cx = W * .5, cy = H * (S.cyF || .56), RX = W * S.RX, RY = W * S.RY;
  if (kind === 'fl' || kind === 'fs' || kind === 'ab') { sheath(g, r, cx, cy, RX, RY, -1); }
  bunch(g, r, { cx, cy, RX, RY, n: S.n, gloss: S.gloss, elong: S.elong, spine: S.spine, spineLen: S.spineLen, spineCol: S.spineCol, core: S.core, color: S.color });
  if (kind === 'fl' || kind === 'fs' || kind === 'ab') { sheath(g, r, cx, cy, RX, RY, 1); }
  if (kind === 'rp') loose(g, r, W, H, 6, '#e4531b', '#f2892a', '#2a120c');
  if (kind === 'ov') loose(g, r, W, H, 22, '#9a4420', '#4a2612', '#22140b');
}
function paintAll(root = document) { root.querySelectorAll('canvas[data-art]').forEach(c => { if (!c.dataset.done) { drawArt(c, c.dataset.art); c.dataset.done = 1; } }); }

/* ---------- real photos (Wikimedia Commons, free licences; credits shown in the Guide) ---------- */
const PHOTO = { fl: 'img/fl.jpg', fs: 'img/fs.jpg', yg: 'img/yg.jpg', bk: 'img/bk.jpg', tn: 'img/tn.jpg', rp: 'img/rp.jpg', ab: 'img/ab.jpg', male: 'img/male.jpg' };
const CREDITS = [
  ['fl', 'Philippe Hornus', 'CC BY 4.0', 'https://www.inaturalist.org/observations/359204179'],
  ['fs', 'Forest and Kim Starr', 'CC BY 3.0 US', 'https://commons.wikimedia.org/wiki/File:Starr-120702-7947-Elaeis_guineensis-green_fruit-USDA_Plant_Materials_Center-Molokai_(24555665244).jpg'],
  ['yg', 'Forest and Kim Starr', 'CC BY 3.0 US', 'https://commons.wikimedia.org/wiki/File:Starr-120702-7945-Elaeis_guineensis-green_fruit-USDA_Plant_Materials_Center-Molokai_(25093079911).jpg'],
  ['bk', 'CEphoto, Uwe Aranas', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Kimanis_Sabah_Palm-oil-fruits-of-Kimanis-Estate-01.jpg'],
  ['tn', 'Philippe Hornus', 'CC BY 4.0', 'https://www.inaturalist.org/observations/359204694'],
  ['rp', 'Fabrício Mil Homens Riella', 'CC BY 4.0', 'https://www.inaturalist.org/observations/190012280'],
  ['ab', 'Forest and Kim Starr', 'CC BY 3.0 US', 'https://commons.wikimedia.org/wiki/File:Starr-120702-7946-Elaeis_guineensis-fruit-USDA_Plant_Materials_Center-Molokai_(25186341335).jpg'],
  ['male', 'Forest and Kim Starr', 'CC BY 3.0 US', 'https://commons.wikimedia.org/wiki/File:Starr-120702-7938-Elaeis_guineensis-flowers-USDA_Plant_Materials_Center-Molokai_(25068052942).jpg']
];
const s_code = k => (STAGES.find(s => s.k === k) || { code: 'M' }).code;
const artHtml = k => PHOTO[k] ? `<img class="art" src="${PHOTO[k]}" alt="">` : `<canvas class="art" width="480" height="480" data-art="${k}"></canvas>`;
function zoom(k) { const z = $('zoom'); if (!PHOTO[k]) return; $('zoomImg').src = PHOTO[k]; $('zoomCap').textContent = t('s_' + k) + ' · ' + t(k === 'male' ? 'w_male' : 'k_' + k); z.hidden = false; }
$('zoom').onclick = () => { $('zoom').hidden = true; };

/* ---------- guide ---------- */
function renderGuide() {
  const tl = $('timeline');
  tl.innerHTML = STAGES.slice(0, 6).map(s => `<span style="background:var(${s.css})">${s.code} ${esc(t('s_' + s.k))}</span>`).join('');
  $('guideStages').innerHTML = [...STAGES, { k: 'male', code: 'M' }].map(s => `
    <div class="guide-stage"><button class="zbtn" data-zoom="${s.k}" aria-label="${esc(t('s_' + s.k))}">${artHtml(s.k)}${PHOTO[s.k] ? '' : `<small>${esc(t('drawing'))}</small>`}</button>
    <div><h3>${s.code} · ${esc(t('s_' + s.k))}</h3><span class="when">${esc(t('a_' + s.k))} · ${esc(t('w_' + s.k))}</span>
    <div class="mk">${esc(t('markersL'))}</div><ul>${t('m_' + s.k).split('|').map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('');
  paintAll($('guideStages'));
  $('credits').innerHTML = `<b>${esc(t('credits'))}</b>` + CREDITS.map(([k, a, l, u]) => `<span>${s_code(k)} ${esc(t('s_' + k))}: ${esc(a)}, ${esc(l)}, <a href="${u}" target="_blank" rel="noopener">${u.includes('inaturalist') ? 'iNaturalist' : 'Wikimedia Commons'}</a></span>`).join('') + `<span>${esc(t('ovNote'))}</span>`;
}

/* ---------- tabs + hash ---------- */
const TABS = ['count', 'dash', 'palms', 'mill', 'setup', 'guide', 'survey', 'tag'];
let tab = 'count';
function setTab(name, push = true) {
  if (!TABS.includes(name) || (name === 'setup' && !S.canEdit)) name = 'count';
  tab = name;
  showSurvey(name === 'survey');
  showTag(name === 'tag');
  setTimeout(autoNear, 0);
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('sub', name === 'survey' && b.dataset.tab === 'palms'));
  document.querySelectorAll('section[data-view]').forEach(s => s.hidden = s.dataset.view !== name);
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name || ((name === 'survey' || name === 'tag') && b.dataset.tab === 'palms')));
  $('helpBtn').setAttribute('aria-pressed', name === 'guide');
  if (push && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('helpBtn').onclick = () => setTab(tab === 'guide' ? 'count' : 'guide');
$('guideStart').onclick = () => setTab('count');
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (parseId(h)) { openPalm(h); return; }
  if (h === 'harvest') { setTab('count', false); return; }
  if (TABS.includes(h)) { closePalm(false); setTab(h, false); }
}
window.addEventListener('hashchange', route);

/* ---------- metrics ---------- */
function metrics() {
  const mo = thisMonth(), td = today();
  const latest = {}; const months = {}; const todayRows = [];
  let counted = 0, dev = 0, male = 0, ovPalms = [], fc = [0, 0, 0];
  const allMonths = new Set();
  for (const [id, p] of Object.entries(S.palms)) {
    const cs = censuses(p); if (!cs.length) continue;
    const L = cs[0]; latest[id] = L;
    for (const c of cs) {
      allMonths.add(c.m);
      const agg = months[c.m] || (months[c.m] = { fs: 0, yg: 0, bk: 0, tn: 0, rp: 0 });
      for (const k of ['fs', 'yg', 'bk', 'tn', 'rp']) agg[k] += +c.s[k] || 0;
    }
    if (L.m === mo) {
      counted++; dev += devOf(L.s); if (L.male) male++;
      if (+L.s.ov > 0) ovPalms.push({ id, n: +L.s.ov });
      if (L.d === td) todayRows.push({ id, ...L });
    }
    // forecast from each palm's latest count (if within the last 2 months)
    fc[0] += (+L.s.tn || 0) + (+L.s.rp || 0); fc[1] += +L.s.bk || 0; fc[2] += (+L.s.yg || 0) + (+L.s.fs || 0) + (+L.s.fl || 0);
  }
  const totalPalms = blocks().reduce((s, b) => s + (+b.palms || 0), 0);
  const acres = blocks().reduce((s, b) => s + (+b.acres || 0), 0);
  // weak palms: average developing over counted months, needs >= 2 months of data farm-wide
  let weak = [];
  if (allMonths.size >= 2) {
    const all = [];
    for (const b of blocks()) for (let i = 1; i <= (+b.palms || 0); i++) {
      const id = palmId(b.id, i), p = S.palms[id]; if (p && p.flag && p.flag.dead) continue;
      const cs = censuses(p); if (!cs.length) continue;
      all.push({ id, avg: cs.slice(0, 6).reduce((a, c) => a + devOf(c.s), 0) / Math.min(6, cs.length) });
    }
    all.sort((a, b) => a.avg - b.avg); weak = all.slice(0, Math.max(1, Math.ceil(all.length * .1)));
  }
  const n0 = dayNum(td); let t365 = 0, tB = 0, bB = 0;
  for (const tk of S.tickets) { const ago = n0 - dayNum(tk.date); if (ago < 365) t365 += tk.tonnes; if (ago < 90 && tk.bunches > 0) { tB += tk.tonnes; bB += tk.bunches; } }
  todayRows.sort((a, b) => (b.t || 0) - (a.t || 0));
  ovPalms.sort((a, b) => b.n - a.n);
  return { mo, latest, months, todayRows, counted, dev, male, ovPalms, fc, totalPalms, acres, weak, t365, bunchKg: bB ? tB * 1000 / bB : null };
}

/* ---------- render ---------- */
function kpi(v, label, alert, jump, sw) {
  const inner = `<div class="v">${v}</div><div class="l">${sw ? `<span class="sw" style="background:var(${sw})"></span>` : ''}${esc(label)}</div>`;
  return jump ? `<button class="kpi${alert ? ' alert' : ''}" data-jump="${jump}">${inner}</button>` : `<div class="kpi${alert ? ' alert' : ''}">${inner}</div>`;
}
function pillsFor(s) { return STAGES.filter(x => +s[x.k] > 0).map(x => `<span class="pill"><i style="background:var(${x.css})"></i>${nf(+s[x.k])}</span>`).join(''); }
function renderAll() {
  refreshBlocks();
  if (tab === 'tag') renderTag();
  setTimeout(autoNear, 0);
  const c = S.config;
  $('farmName').textContent = (c && c.name) || 'Palm Bunch Register';
  $('farmSub').textContent = c ? blocks().map(b => `${b.id}: ${t('acresShort', String(+b.acres || 0), nf(+b.palms || 0))}`).join('  ·  ') : '';
  fillBlockSelects();
  const M = metrics();
  renderOpener(M);
  $('todayList').innerHTML = M.todayRows.length ? M.todayRows.slice(0, 80).map(r => `<li><button class="id" data-open="${esc(r.id)}">${esc(r.id)}</button><span class="grow"><span class="pills">${pillsFor(r.s)}</span>${r.male ? ` ${esc(t('male'))}` : ''}${S.uid && r.by === S.uid ? ` · ${esc(t('you'))}` : ''}</span><span class="num">${nf(devOf(r.s))}</span></li>`).join('') : `<li class="empty">${esc(t('noneToday'))}</li>`;
  $('dashKpis').innerHTML =
    kpi(`${nf(M.counted)}<small> / ${nf(M.totalPalms)}</small>`, t('kCounted'), false, 'map:not') +
    kpi(nf(M.dev), t('kDev')) +
    kpi(M.counted ? nf(M.dev / M.counted, 1) : '—', t('kAvg')) +
    kpi(nf(M.ovPalms.length), t('kOv'), M.ovPalms.length > 0, 'map:ov') +
    kpi(nf(M.male), t('kMale'), false, 'map:male') +
    kpi(M.acres && M.t365 ? nf(M.t365 / M.acres, 2) : '—', t('kTacre')) +
    kpi(M.bunchKg ? nf(M.bunchKg, 1) : '—', t('kKg')) +
    kpi(nf(M.t365, 2), t('kTonnes'));
  $('fcKpis').innerHTML = kpi(nf(M.fc[0]), t('fc1'), false, null, '--st-rp') + kpi(nf(M.fc[1]), t('fc2'), false, null, '--st-bk') + kpi(nf(M.fc[2]), t('fc3'), false, null, '--st-yg');
  $('ovList').innerHTML = M.ovPalms.length ? M.ovPalms.slice(0, 60).map(o => `<li><button class="id" data-open="${esc(o.id)}">${esc(o.id)}</button><span class="grow"></span><span class="num" style="color:var(--bad)">${nf(o.n)}</span></li>`).join('') : `<li class="empty">${esc(t('noneOv'))}</li>`;
  $('weakList').innerHTML = M.weak.length ? M.weak.map(w => `<li><button class="id" data-open="${esc(w.id)}">${esc(w.id)}</button><span class="grow">${esc(flagText(S.palms[w.id]))}</span><span class="num">${nf(w.avg, 1)}</span></li>`).join('') : `<li class="empty">${esc(t('weakWait'))}</li>`;
  const nc = []; for (const b of blocks()) for (let i = 1; i <= (+b.palms || 0); i++) { const id = palmId(b.id, i); if (!M.latest[id] || M.latest[id].m !== M.mo) nc.push(id); }
  $('ncList').innerHTML = nc.length ? `<li><span class="grow">${esc(t('roundOf', nf(nc.length), nf(M.totalPalms)))}</span></li>` + nc.slice(0, 40).map(id => `<li><button class="id" data-open="${id}">${id}</button></li>`).join('') : `<li class="empty">${esc(t('allCounted'))}</li>`;
  { let g = 0; for (const p of Object.values(S.palms)) if (p && p.loc) g++; $('gpsCount').textContent = t('gpsCount', nf(g), nf(M.totalPalms)); }
  renderChart(M); renderMap(M); renderTickets(); renderSetup();
  if (!$('sheet').hidden && curPalm) renderPalm();
}
function renderChart(M) {
  const svg = $('chart'), W = 640, H = 230, L = 36, B = 26, top = 14;
  const keys = ['rp', 'tn', 'bk', 'yg', 'fs'];
  $('chartLegend').innerHTML = keys.slice().reverse().map(k => `<span><i style="background:var(--st-${k})"></i>${esc(t('s_' + k).split(' –')[0])}</span>`).join('');
  const now = new Date(), ks = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); ks.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); }
  const tot = ks.map(k => M.months[k] ? keys.reduce((a, s) => a + M.months[k][s], 0) : 0);
  const max = Math.max(...tot);
  if (!max) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" style="font-size:15px">${esc(t('chartEmpty'))}</text>`; return; }
  const step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step;
  const y = v => top + (H - B - top) * (1 - v / nice), bw = (W - L) / 12;
  let h = '';
  for (let gi = 0; gi <= 4; gi++) { const v = nice * gi / 4; h += `<line class="grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v)}</text>`; }
  ks.forEach((k, i) => {
    const x = L + i * bw + bw * .18, w = bw * .64; let acc = 0;
    if (M.months[k]) for (const s of ['fs', 'yg', 'bk', 'tn', 'rp']) { const v = M.months[k][s]; if (!v) continue; h += `<rect x="${x}" y="${y(acc + v)}" width="${w}" height="${y(acc) - y(acc + v)}" style="fill:var(--st-${s})"/>`; acc += v; }
    if (tot[i]) h += `<text x="${x + w / 2}" y="${y(tot[i]) - 4}" text-anchor="middle">${nf(tot[i])}</text>`;
    const [yy, mm] = k.split('-').map(Number);
    h += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${esc(new Date(yy, mm - 1, 1).toLocaleDateString(LANG === 'te' ? 'te-IN' : 'en-IN', { month: 'short' }))}</text>`;
  });
  svg.innerHTML = h;
}
/* ---------- field layout ----------
   A block may carry rows: [palms in row 1, row 2, ...] (palm numbers run row by row),
   diamond: true (every other row shifted half a palm) and pos: [[x, y], ...] in metres,
   one per palm number, taken from the Palm Yield Tracker's GPS backup (x east, y south). */
const SPACING = 9, ROWGAP_DIAMOND = 7.8;
const hasPos = b => Array.isArray(b.pos) && b.pos.length === (+b.palms || 0) && b.pos.length > 0;
function rowTreeOf(b, n) {
  if (!Array.isArray(b.rows)) return null;
  let left = n;
  for (let r = 0; r < b.rows.length; r++) { if (left <= b.rows[r]) return [r + 1, left]; left -= b.rows[r]; }
  return null;
}
function palmXY(b, n) {
  if (hasPos(b)) return b.pos[n - 1];
  const rt = rowTreeOf(b, n); if (!rt) return null;
  const [r, k] = rt, shift = b.diamond && r % 2 === 0 ? SPACING / 2 : 0;
  return [(k - 1) * SPACING + shift, (r - 1) * (b.diamond ? ROWGAP_DIAMOND : SPACING)];
}
let mapBlock = null, mapFilter = 'all';
function renderMap(M) {
  const bs = blocks();
  if (!bs.find(b => b.id === mapBlock)) mapBlock = bs[0] ? bs[0].id : null;
  $('mapBlocks').innerHTML = bs.length > 1 ? bs.map(b => `<button class="chip" data-mb="${esc(b.id)}" aria-pressed="${b.id === mapBlock}">${esc(b.id)}</button>`).join('') : '';
  $('mapFilters').innerHTML = [['all', 'fAll'], ['not', 'fNot'], ['ov', 'fOv'], ['male', 'fMale'], ['flagged', 'fFlagged']].map(([k, l]) => `<button class="chip" data-mf="${k}" aria-pressed="${mapFilter === k}">${esc(t(l))}</button>`).join('');
  $('legend').innerHTML = `<span><i style="background:var(--h0)"></i>${esc(t('legend0'))}</span><span><i style="background:var(--h1)"></i>${esc(t('legend1'))}</span><span><i style="background:var(--h2)"></i>${esc(t('legend2'))}</span><span><i style="background:var(--h3)"></i>${esc(t('legend3'))}</span><span><i style="box-shadow:inset 0 0 0 2px var(--bad)"></i>${esc(t('legendF'))}</span>`;
  const b = blockOf(mapBlock); if (!b) { $('heat').innerHTML = ''; $('fieldMap').innerHTML = ''; $('mapHint').textContent = ''; return; }
  const useLayout = Array.isArray(b.rows) && b.rows.length > 0;
  $('heat').hidden = useLayout;
  let h = '', g = '';
  for (let i = 1; i <= (+b.palms || 0); i++) {
    const id = palmId(b.id, i), p = S.palms[id], L = M.latest[id], cur = L && L.m === M.mo;
    const v = L ? devOf(L.s) : null;
    const lvl = v == null ? '' : v <= 1 ? 'l1' : v <= 3 ? 'l2' : 'l3';
    const isFlag = !!(p && p.flag && Object.values(p.flag).some(Boolean));
    const show = mapFilter === 'all' || (mapFilter === 'not' && !cur) || (mapFilter === 'ov' && cur && +L.s.ov > 0) || (mapFilter === 'male' && cur && L.male) || (mapFilter === 'flagged' && isFlag);
    const cls = `${lvl}${isFlag ? ' flag' : ''}${show ? '' : ' dim'}`;
    if (!useLayout) { h += `<button class="${cls}" data-open="${id}" aria-label="${id}">${i}</button>`; continue; }
    const xy = palmXY(b, i); if (!xy) continue;
    g += `<g class="${cls}" data-open="${id}" role="button" aria-label="${id}"><circle cx="${xy[0].toFixed(1)}" cy="${xy[1].toFixed(1)}" r="3.6"/><text x="${xy[0].toFixed(1)}" y="${(xy[1] + 1).toFixed(1)}" font-size="2.8" text-anchor="middle">${i}</text></g>`;
  }
  $('heat').innerHTML = useLayout ? '' : h;
  if (!useLayout) { $('fieldMap').innerHTML = ''; $('mapHint').textContent = ''; return; }
  // row labels on the schematic view, then fit the drawing
  const pts = []; for (let i = 1; i <= (+b.palms || 0); i++) { const xy = palmXY(b, i); if (xy) pts.push(xy); }
  if (!hasPos(b)) { let n = 0; b.rows.forEach((c, r) => { const xy = palmXY(b, n + 1); if (xy) g += `<text class="rl" x="${(xy[0] - 7).toFixed(1)}" y="${(xy[1] + 1.2).toFixed(1)}" font-size="3.4" text-anchor="end">R${r + 1}</text>`; n += c; }); }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs) - (hasPos(b) ? 6 : 14), x1 = Math.max(...xs) + 6, y0 = Math.min(...ys) - 6, y1 = Math.max(...ys) + 6;
  $('fieldMap').innerHTML = `<svg class="field-map" viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}" role="img" aria-label="${esc(t('palmMap'))}">${g}</svg>`;
  $('mapHint').textContent = t(hasPos(b) ? 'mapHintGps' : 'mapHintRows');
}
function renderTickets() {
  const list = S.tickets.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  $('ticketList').innerHTML = list.length ? list.map(tk => `<li><span class="id">${esc(fmtDate(tk.date))}</span><span class="grow">${esc(tk.block || '')}${tk.no ? ' · #' + esc(tk.no) : ''}${tk.bunches ? ` · ${nf(tk.bunches)} ${esc(LANG === 'te' ? 'గెలలు' : 'bunches')} · ${nf(tk.tonnes * 1000 / tk.bunches, 1)} kg` : ''}</span><span class="num">${nf(tk.tonnes, 3)} ${esc(t('unitT'))}</span>${S.canEdit ? `<button class="btn small" data-deltk="${esc(tk.id)}">${esc(t('del'))}</button>` : ''}</li>`).join('') : `<li class="empty">${esc(t('noTickets'))}</li>`;
}
function fillBlockSelects() {
  const opts = blocks().map(b => `<option value="${esc(b.id)}">${esc(b.id)}</option>`).join('');
  for (const id of ['labelBlock', 'tkBlock']) { const s = $(id), v = s.value; s.innerHTML = (id === 'tkBlock' ? '<option value="">—</option>' : '') + opts; if ([...s.options].some(o => o.value === v)) s.value = v; }
}

/* ---------- opener ---------- */
let openBlock = null, numStr = '';
try { openBlock = localStorage.getItem('pbr:block'); } catch {}
function renderOpener(M) {
  const bs = blocks();
  if (!bs.find(b => b.id === openBlock)) openBlock = bs[0] ? bs[0].id : null;
  $('openBlocks').innerHTML = bs.length > 1 ? bs.map(b => `<button class="chip" data-ob="${esc(b.id)}" aria-pressed="${b.id === openBlock}">${esc(b.id)}</button>`).join('') : '';
  const b = blockOf(openBlock);
  $('numBlock').textContent = openBlock || '—';
  $('numVal').textContent = numStr ? numStr.padStart(4, '0') : '';
  $('numOf').textContent = b ? t('numOf', nf(+b.palms || 0)) : '';
  $('kGo').disabled = !numStr || !b;
  const r = $('round'), c = $('continueBtn');
  if (!b || !+b.palms) { r.innerHTML = ''; c.hidden = true; return; }
  let done = 0, lastToday = 0, lastT = 0, firstDue = null;
  for (let i = 1; i <= +b.palms; i++) {
    const L = M.latest[palmId(b.id, i)];
    if (L && L.m === M.mo) { done++; if (L.d === today() && (L.t || 0) >= lastT) { lastT = L.t || 0; lastToday = i; } }
    else if (firstDue == null) firstDue = i;
  }
  const pct = Math.round(done / +b.palms * 100);
  r.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(t('roundL'))}</span><b>${pct}%</b></div><div class="bar"><i style="width:${pct}%"></i></div><span>${esc(t('roundOf', nf(done), nf(+b.palms)))}</span>`;
  let next = null;
  if (lastToday) { for (let i = lastToday + 1; i <= +b.palms; i++) { const L = M.latest[palmId(b.id, i)]; if (!L || L.m !== M.mo) { next = i; break; } } }
  if (next == null) next = firstDue;
  if (next) { c.hidden = false; c.dataset.open = palmId(b.id, next); c.innerHTML = `<span>${esc(t('cont'))}</span><b>${palmId(b.id, next)}</b>`; } else c.hidden = true;
}
$('openBlocks').addEventListener('click', e => { const b = e.target.closest('[data-ob]'); if (!b) return; openBlock = b.dataset.ob; try { localStorage.setItem('pbr:block', openBlock); } catch {} numStr = ''; renderOpener(metrics()); });
function keyIn(k) {
  const b = blockOf(openBlock), maxLen = b ? String(+b.palms).length : 4;
  $('numVal').parentElement.classList.remove('err');
  if (k === 'del') numStr = numStr.slice(0, -1);
  else if (k === 'go') { goNum(); return; }
  else if (numStr.length < maxLen) numStr = (numStr + k).replace(/^0+/, '');
  buzz(8); renderOpener(metrics());
}
function goNum() {
  const b = blockOf(openBlock), n = parseInt(numStr, 10);
  if (!b || !n) return;
  if (n > +b.palms) { const d = $('numVal').parentElement; d.classList.remove('err'); void d.offsetWidth; d.classList.add('err'); buzz([30, 40, 30]); toast(t('badPalm', n, b.id, b.palms)); return; }
  numStr = ''; openPalm(palmId(b.id, n)); renderOpener(metrics());
}
$('keypad').addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) keyIn(k.dataset.k); });
document.addEventListener('keydown', e => {
  if (!$('sheet').hidden || tab !== 'count' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (/^\d$/.test(e.key)) keyIn(e.key); else if (e.key === 'Backspace') keyIn('del'); else if (e.key === 'Enter') keyIn('go');
});

/* ---------- setup ---------- */
let setupDraft = null;
function renderSetup() {
  if (!S.canEdit) return;
  if (!setupDraft) setupDraft = JSON.parse(JSON.stringify(S.config || { name: '', blocks: [{ id: 'B01', acres: 10, palms: 570, planted: '' }] }));
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#setRows, #setFarm')) return;
  $('setFarm').value = setupDraft.name || '';
  renderLayout();
  $('setRows').innerHTML = setupDraft.blocks.map((b, i) => `<tr>
    <td><input id="sb-id-${i}" data-i="${i}" data-k="id" value="${esc(b.id)}" autocomplete="off"></td>
    <td><input id="sb-ac-${i}" data-i="${i}" data-k="acres" inputmode="decimal" value="${esc(b.acres)}"></td>
    <td><input id="sb-pa-${i}" data-i="${i}" data-k="palms" inputmode="numeric" value="${esc(b.palms)}"></td>
    <td><input id="sb-pl-${i}" data-i="${i}" data-k="planted" inputmode="numeric" value="${esc(b.planted || '')}"></td>
    <td><button class="btn small" data-rmb="${i}" aria-label="${esc(t('del'))}">×</button></td></tr>`).join('');
}
const renderSetupForce = () => { document.activeElement && document.activeElement.blur(); renderSetup(); };
$('setRows').addEventListener('input', e => { const el = e.target; if (el.dataset.k) setupDraft.blocks[+el.dataset.i][el.dataset.k] = el.value; });
$('setRows').addEventListener('click', e => { const b = e.target.closest('[data-rmb]'); if (!b) return; setupDraft.blocks.splice(+b.dataset.rmb, 1); renderSetupForce(); });
$('setFarm').addEventListener('input', e => setupDraft.name = e.target.value);
$('addBlock').onclick = () => { const n = setupDraft.blocks.length + 1; setupDraft.blocks.push({ id: 'B' + pad(n), acres: '', palms: '', planted: '' }); renderSetupForce(); };
$('saveSetup').onclick = async () => {
  if (!db) return;
  const clean = { name: (setupDraft.name || '').trim().slice(0, 80), blocks: setupDraft.blocks.map(b => ({
    id: String(b.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6), acres: Math.max(0, parseFloat(b.acres) || 0),
    palms: Math.max(0, Math.min(20000, parseInt(b.palms, 10) || 0)), planted: parseInt(b.planted, 10) || null, ...cleanLayout(b) })).filter(b => b.id) };
  for (const b of clean.blocks) if (b.rows) b.palms = b.rows.reduce((a, c) => a + c, 0);
  for (const b of clean.blocks) if (b.pos && b.pos.length !== b.palms) delete b.pos;
  try { await db.doc('config/farm').set(clean); setupDraft = null; layUnsaved = false; toast(t('setupSaved')); } catch { toast(t('saveFailed')); }
};

/* ---------- setup: field layout per block ---------- */
const parseRows = txt => String(txt || '').split(/[^0-9]+/).map(x => parseInt(x, 10)).filter(x => x > 0 && x <= 2000).slice(0, 500);
function cleanLayout(b) {
  const rows = Array.isArray(b.rows) ? b.rows.map(x => parseInt(x, 10)).filter(x => x > 0) : [];
  if (!rows.length) return {};
  const out = { rows, diamond: !!b.diamond };
  if (Array.isArray(b.pos) && b.pos.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) out.pos = b.pos.map(p => [+(+p[0]).toFixed(1), +(+p[1]).toFixed(1)]);
  return out;
}
let layIdx = 0, layUnsaved = false;
function renderLayout() {
  if (!S.canEdit || !setupDraft) return;
  if (layIdx >= setupDraft.blocks.length) layIdx = 0;
  $('layBlock').innerHTML = setupDraft.blocks.map((b, i) => `<option value="${i}">${esc(b.id || '?')}</option>`).join('');
  $('layBlock').value = String(layIdx);
  const b = setupDraft.blocks[layIdx]; if (!b) return;
  if (document.activeElement !== $('layRows')) $('layRows').value = (b.rows || []).join(', ');
  $('layDiamond').checked = !!b.diamond;
  layStatus();
}
function layStatus() {
  const b = setupDraft && setupDraft.blocks[layIdx]; if (!b) return;
  const rows = b.rows || [], sum = rows.reduce((a, c) => a + c, 0);
  let msg = rows.length ? t('layInfo', rows.length, sum, b.pos && b.pos.length === sum ? t('layGps') : '') : t('layNone');
  if (rows.length && sum !== (parseInt(b.palms, 10) || 0)) msg += ' ' + t('layMismatch', sum, parseInt(b.palms, 10) || 0);
  if (layUnsaved) msg += ' ' + t('layUnsaved');
  $('layStatus').textContent = msg;
}
$('layBlock').onchange = e => { layIdx = +e.target.value; renderLayout(); };
$('layRows').addEventListener('input', e => { const b = setupDraft.blocks[layIdx]; const r = parseRows(e.target.value); b.rows = r; if (b.pos && b.pos.length !== r.reduce((a, c) => a + c, 0)) delete b.pos; layUnsaved = true; layStatus(); });
$('layDiamond').onchange = e => { setupDraft.blocks[layIdx].diamond = e.target.checked; layUnsaved = true; layStatus(); };
$('layClear').onclick = () => { const b = setupDraft.blocks[layIdx]; delete b.rows; delete b.pos; b.diamond = false; layUnsaved = true; renderLayout(); };
$('layImport').onclick = () => $('layFile').click();
$('layFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!d || !Array.isArray(d.rows)) throw 0;
    // rows in row-number order; palm numbers run row by row, tree 1 first
    const rows = d.rows.filter(r => r.count > 0).sort((a, b) => a.no - b.no);
    if (!rows.length) throw 0;
    const counts = rows.map(r => +r.count);
    const byId = {}; for (const tr of (d.trees || [])) byId[tr.id] = tr;
    const ll = []; for (const r of rows) for (let k = 1; k <= r.count; k++) ll.push(byId[`R${r.no}-T${k}`]);
    const b = setupDraft.blocks[layIdx];
    b.rows = counts; b.palms = counts.reduce((a, c) => a + c, 0); b.diamond = true;
    if (ll.every(Boolean)) {
      // flat-earth metres around the first palm: x east, y south (north at the top of the map)
      const o = ll[0], kx = 111320 * Math.cos(o.lat * Math.PI / 180), ky = 110540;
      b.pos = ll.map(p => [+((p.lng - o.lng) * kx).toFixed(1), +(-(p.lat - o.lat) * ky).toFixed(1)]);
    } else delete b.pos;
    layUnsaved = true; renderSetupForce(); renderLayout();
    toast(t('layLoaded', counts.length, b.palms));
  } catch { toast(t('layBad')); }
};

/* ---------- palm sheet (monthly census) ---------- */
let curPalm = null, cnt = {}, male = false, flagDraft = {}, dirty = false, openedHere = false;
const FLAGS = [{ k: 'disease', t: 'fDisease' }, { k: 'water', t: 'fWater' }, { k: 'pest', t: 'fPest' }, { k: 'dead', t: 'fDead' }, { k: 'tag', t: 'fTag' }];
const flagText = p => (!p || !p.flag) ? '' : FLAGS.filter(f => p.flag[f.k]).map(f => t(f.t)).join(', ');
function buildStageCounters() {
  $('pStages').innerHTML = STAGES.map(s => `
    <div class="st" data-st="${s.k}">
      <button class="pic" data-plus="${s.k}" aria-label="+1 ${esc(t('s_' + s.k))}">${artHtml(s.k)}<span class="badge" data-tw="w_${s.k}"></span>${PHOTO[s.k] ? '' : `<span class="badge" style="top:auto;bottom:8px" data-tw="drawing"></span>`}</button>
      <div class="name"><i style="background:var(${s.css})"></i><span><b>${s.code}</b> <span data-tn="s_${s.k}"></span></span></div>
      <div class="key" data-tk="k_${s.k}"></div>
      <div class="ctl"><button data-minus="${s.k}" aria-label="−1">−</button><b data-v="${s.k}">0</b><button class="plus" data-plus="${s.k}" aria-label="+1">+</button></div>
    </div>`).join('');
  paintAll($('pStages')); paintAll($('pMale'));
}
function openPalm(id, here = false) {
  const p = parseId(id); if (!p) return;
  const b = blockOf(p.block);
  if (S.config && b && (p.n < 1 || p.n > +b.palms)) { toast(t('badPalm', p.n, p.block, b.palms)); return; }
  curPalm = palmId(p.block, p.n); openedHere = here;
  if (!$('pMonth').value) $('pMonth').value = thisMonth();
  loadEntry(true);
  $('sheet').hidden = false; $('sheet').scrollTop = 0;
  if (location.hash !== '#' + curPalm) history.replaceState(null, '', '#' + curPalm);
  renderPalm(); gpsSync();
}
function loadEntry(withFlags) {
  const p = S.palms[curPalm], e = p && p.c && p.c[$('pMonth').value];
  cnt = {}; STAGES.forEach(s => cnt[s.k] = e && e.s ? +e.s[s.k] || 0 : 0);
  male = !!(e && e.male); dirty = false;
  if (withFlags) { flagDraft = Object.assign({}, (p && p.flag) || {}); $('pNote').value = (p && p.note) || ''; }
}
function closePalm(fixHash = true) { $('sheet').hidden = true; curPalm = null; openedHere = false; $('pMonth').value = ''; if (fixHash) history.replaceState(null, '', '#' + tab); gpsSync(); }
function renderPalm() {
  const id = curPalm, p = S.palms[id], pr = parseId(id), b = blockOf(pr.block), cs = censuses(p);
  $('pId').textContent = id;
  const rt = b ? rowTreeOf(b, p.n) : null;
  $('pBlock').textContent = b ? `${t('block')} ${b.id}${b.planted ? ' · ' + b.planted : ''}${rt ? ' · ' + t('rowTree', rt[0], rt[1]) : ''}` : '';
  const cur = cs.find(c => c.m === thisMonth());
  const since = $('pSince'); since.className = 'since' + (cur ? ' ok' : ''); since.textContent = cur ? t('countedOn', fmtDate(cur.d || today())) : t('notYet');
  $('pPrev').disabled = pr.n <= 1; $('pNext').disabled = !!(b && pr.n >= +b.palms);
  document.querySelectorAll('#pStages [data-tn]').forEach(el => el.textContent = t(el.dataset.tn));
  document.querySelectorAll('#pStages [data-tw]').forEach(el => el.textContent = t(el.dataset.tw));
  document.querySelectorAll('#pStages [data-tk]').forEach(el => el.textContent = t(el.dataset.tk));
  STAGES.forEach(s => { const el = document.querySelector(`#pStages [data-v="${s.k}"]`); el.textContent = cnt[s.k]; el.closest('.st').classList.toggle('zero', !cnt[s.k]); el.closest('.st').classList.toggle('ripe', s.k === 'rp' && cnt[s.k] > 0); });
  $('pTotal').textContent = devOf(cnt);
  $('pMale').setAttribute('aria-pressed', male);
  const ex = p && p.c && p.c[$('pMonth').value];
  $('pExisting').textContent = ex && !dirty ? t('alreadyLogged') : '';
  if (!$('pGpsBtn').disabled) { $('pGps').textContent = gpsText(p); $('pGpsBtn').textContent = t(p && p.loc ? 'gpsImprove' : 'gpsBtn'); }
  $('pFlags').innerHTML = FLAGS.map(f => `<button class="chip" data-flag="${f.k}" aria-pressed="${!!flagDraft[f.k]}">${esc(t(f.t))}</button>`).join('');
  $('pHist').innerHTML = cs.length ? cs.slice(0, 24).map(c => `<li><span class="id">${esc(fmtMonth(c.m))}</span><span class="grow"><span class="pills">${pillsFor(c.s)}</span>${c.male ? ' ' + esc(t('male')) : ''}</span><span class="num">${nf(devOf(c.s))}</span>${S.canWrite !== false ? `<button class="btn small" data-delm="${c.m}">${esc(t('del'))}</button>` : ''}</li>`).join('') : `<li class="empty">${esc(t('notYet'))}</li>`;
  const ro = !db || S.canWrite === false;
  ['pSave', 'pSaveNext'].forEach(k => $(k).disabled = ro);
  document.querySelectorAll('#pStages button').forEach(x => x.disabled = ro);
}
function bump(k) { const el = document.querySelector(`#pStages [data-v="${k}"]`); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); buzz(12); }
$('pStages').addEventListener('click', e => {
  const pl = e.target.closest('[data-plus]'), mi = e.target.closest('[data-minus]');
  if (pl && !pl.disabled) { cnt[pl.dataset.plus]++; dirty = true; renderPalm(); bump(pl.dataset.plus); }
  else if (mi && !mi.disabled) { const k = mi.dataset.minus; cnt[k] = Math.max(0, cnt[k] - 1); dirty = true; renderPalm(); bump(k); }
});
$('pMale').onclick = () => { if ($('pSave').disabled) return; male = !male; dirty = true; buzz(10); renderPalm(); };
$('pMonth').onchange = () => { loadEntry(false); renderPalm(); };
$('pClose').onclick = () => closePalm();
$('pFlags').addEventListener('click', e => { const b = e.target.closest('[data-flag]'); if (!b) return; flagDraft[b.dataset.flag] = !flagDraft[b.dataset.flag]; dirty = true; b.setAttribute('aria-pressed', !!flagDraft[b.dataset.flag]); });
$('pNote').addEventListener('input', () => { dirty = true; });
function stepPalm(dir) {
  const p = parseId(curPalm); if (!p) return; const b = blockOf(p.block), n = p.n + dir;
  if (n < 1 || (b && n > +b.palms)) return;
  openPalm(palmId(p.block, n));
  const inn = $('sheet').querySelector('.in'); inn.classList.remove('slide-l', 'slide-r'); void inn.offsetWidth; inn.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
}
$('pPrev').onclick = () => stepPalm(-1);
$('pNext').onclick = () => stepPalm(1);
(() => {
  let x0 = null, y0 = null; const s = $('sheet');
  s.addEventListener('touchstart', e => { if (e.target.closest('input, textarea, .stages, .malerow')) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  s.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) stepPalm(dx < 0 ? 1 : -1); });
})();
async function writePalm(id, mutate) {
  const cur = S.palms[id], p = parseId(id);
  const body = cur ? JSON.parse(JSON.stringify(cur)) : { block: p.block, n: p.n, c: {} };
  mutate(body); await db.doc('palms/' + id).set(body);
}
async function savePalm(next) {
  if (!db) return;
  const id = curPalm, m = $('pMonth').value || thisMonth(), s = Object.assign({}, cnt), ml = male, fl = Object.assign({}, flagDraft), note = $('pNote').value.trim().slice(0, 500);
  const prev = S.palms[id] ? JSON.parse(JSON.stringify(S.palms[id])) : null;
  const fix = openedHere && lastFix && Date.now() - lastFix.t < 20000 && lastFix.acc <= 10 ? lastFix : null;
  const btns = [$('pSave'), $('pSaveNext')]; btns.forEach(x => x.disabled = true);
  try {
    await writePalm(id, body => { body.c = body.c || {}; body.c[m] = { s, male: ml, d: today(), by: S.uid || null, t: Date.now() }; body.flag = fl; body.note = note; if (fix) { const g = mergeLoc(body.loc, fix); if (g) body.loc = g; } });
    buzz(25);
    toast(t('savedN', id, devOf(s)), () => prev ? db.doc('palms/' + id).set(prev) : db.doc('palms/' + id).delete());
    if (next) { const p = parseId(id), bl = blockOf(p.block); if (bl && p.n < +bl.palms) { stepPalm(1); return; } }
    if (nearMode) { closePalm(); return; }
    loadEntry(true); renderPalm();
  } catch (e) { toast(t('saveFailed')); if (e && e.code === 'invalid_argument') { S.canWrite = false; renderAll(); } }
  finally { btns.forEach(x => x.disabled = !db || S.canWrite === false); }
}
$('pSave').onclick = () => savePalm(false);
$('pSaveNext').onclick = () => savePalm(true);
$('pHist').addEventListener('click', async e => {
  const b = e.target.closest('[data-delm]'); if (!b || !db) return;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = '✓ ' + t('del'); setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = t('del'); } }, 3000); return; }
  const m = b.dataset.delm;
  try { await writePalm(curPalm, body => { delete body.c[m]; }); if ($('pMonth').value === m) loadEntry(false); } catch { toast(t('saveFailed')); }
});

/* ---------- global clicks, tickets ---------- */
document.addEventListener('click', e => {
  const zb = e.target.closest('[data-zoom]'); if (zb) { zoom(zb.dataset.zoom); return; }
  const o = e.target.closest('[data-open]'); if (o) { openPalm(o.dataset.open); return; }
  const mb = e.target.closest('[data-mb]'); if (mb) { mapBlock = mb.dataset.mb; renderMap(metrics()); return; }
  const mf = e.target.closest('[data-mf]'); if (mf) { mapFilter = mf.dataset.mf; renderMap(metrics()); return; }
  const j = e.target.closest('[data-jump]'); if (j) { const v = j.dataset.jump; if (v.startsWith('map:')) { mapFilter = v.slice(4); setTab('palms'); renderMap(metrics()); } return; }
  const dt = e.target.closest('[data-deltk]');
  if (dt && db) {
    if (dt.dataset.armed !== '1') { dt.dataset.armed = '1'; dt.textContent = '✓ ' + t('del'); setTimeout(() => { if (dt.isConnected) { dt.dataset.armed = ''; dt.textContent = t('del'); } }, 3000); return; }
    db.doc('tickets/' + dt.dataset.deltk).delete().catch(() => toast(t('saveFailed')));
  }
});
$('tkDate').value = today();
$('ticketForm').addEventListener('submit', async e => {
  e.preventDefault(); if (!db) return;
  const tonnes = parseFloat(String($('tkTonnes').value).replace(',', '.'));
  if (!(tonnes > 0 && tonnes < 100)) { toast(t('badTonnes')); return; }
  const bunches = parseInt($('tkBunches').value, 10) || 0;
  try {
    await db.collection('tickets').add({ date: $('tkDate').value || today(), tonnes, bunches, no: $('tkNo').value.trim().slice(0, 40), block: $('tkBlock').value || '', by: S.uid || null, t: Date.now() });
    ['tkTonnes', 'tkBunches', 'tkNo'].forEach(k => $(k).value = ''); toast(t('ticketSaved'));
  } catch { toast(t('saveFailed')); }
});

/* ---------- QR tag PDF ---------- */
function qrPng(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), cell = 6, m = 2, size = (n + m * 2) * cell;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
  return c.toDataURL('image/png');
}
$('labelBtn').onclick = async () => {
  const b = blockOf($('labelBlock').value); if (!b) return;
  if (!downloads) { $('labelStatus').textContent = t('labelsNoDl'); return; }
  const total = +b.palms || 0; if (!total) return;
  $('labelStatus').textContent = t('makingLabels', total); $('labelBtn').disabled = true;
  await new Promise(r => setTimeout(r, 30));
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const cols = 3, rows = 7, mx = 7, my = 8.5, w = (210 - mx * 2) / cols, h = (297 - my * 2) / rows, farm = (S.config && S.config.name) || '';
    for (let i = 0; i < total; i++) {
      const slot = i % (cols * rows); if (i && !slot) doc.addPage();
      const x = mx + (slot % cols) * w, y = my + Math.floor(slot / cols) * h, id = palmId(b.id, i + 1);
      doc.setDrawColor(200); doc.setLineWidth(0.2); doc.roundedRect(x + 1, y + 1, w - 2, h - 2, 2, 2);
      doc.addImage(qrPng(id), 'PNG', x + 3, y + (h - 30) / 2, 30, 30);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(id, x + 35, y + h / 2 - 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90);
      doc.text(farm.slice(0, 26), x + 35, y + h / 2 + 4); doc.text('Scan to count bunches', x + 35, y + h / 2 + 8); doc.setTextColor(0);
    }
    await downloads.save({ filename: `palm-tags-${b.id}.pdf`, data: doc.output('blob') });
    $('labelStatus').textContent = t('labelsDone');
  } catch (e) {
    $('labelStatus').textContent = e && e.code === 'declined' ? '' : (e && (e.code === 'host_unavailable' || e.code === 'unavailable')) ? t('labelsNoDl') : t('saveFailed');
  } finally { $('labelBtn').disabled = false; }
};

/* ---------- how-it-works small drawings ---------- */
(function drawGuideBits() {
  const NS = 'http://www.w3.org/2000/svg';
  const rect = (g, x, y, w, h, cls) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); if (cls) r.setAttribute('class', cls); g.appendChild(r); return r; };
  try { const q = qrcode(0, 'L'); q.addData('B01-0143'); q.make(); const n = q.getModuleCount(), cell = 50 / n, g = $('qr1');
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) rect(g, 212 + c * cell, 106 + r * cell, cell + .15, cell + .15); } catch {}
  const lv = 'f-h3 f-h2 f-h3 f-h1 f-h3 f-h2 f-h3 f-h2 f-h2 f-h3 f-h0 f-h3 f-h2 f-h3 f-h1 f-h3 f-h3 f-h1 f-h3 f-h2 f-h3 f-h3 f-h2 f-h3 f-h2 f-h3 f-h2 f-h3 f-h0 f-h2 f-h3 f-h2 f-h3 f-h2 f-h3 f-h3 f-h1 f-h3 f-h2 f-h3'.split(' ');
  const flagged = new Set([10, 28, 36]);
  lv.forEach((cls, i) => { const r = rect($('heatDemo'), 176 + (i % 8) * 15.5, 72 + Math.floor(i / 8) * 21, 12.5, 17, cls); r.setAttribute('rx', 2.5); if (flagged.has(i)) r.setAttribute('style', 'stroke: var(--bad); stroke-width: 2.4'); });
})();


/* ---------- native: scan, GPS, sync state ---------- */
$('scanBtn').onclick = async () => {
  try { const id = await scanTag(); if (id) openPalm(id, true); else toast(t('scanNone')); } catch (e) { if (e && !/cancel/i.test(String(e.message || e))) toast(t('scanNone')); }
};
function gpsText(p) {
  if (!p || !p.loc) return t('gpsNone');
  const ll = `${p.loc.lat.toFixed(6)}, ${p.loc.lng.toFixed(6)}`;
  return (p.loc.n || 1) > 1 ? t('gpsSavedN', nf(p.loc.acc, 1), ll, p.loc.n) : t('gpsSaved', nf(p.loc.acc, 0), ll);
}
/* metres between two {lat,lng} points (flat-earth is exact enough inside a farm) */
function metres(a, b) {
  const k = Math.PI / 180, R = 6371000;
  const dx = (b.lng - a.lng) * k * Math.cos(((a.lat + b.lat) / 2) * k) * R, dy = (b.lat - a.lat) * k * R;
  return Math.hypot(dx, dy);
}
/* Average a new reading into the saved spot, weighting sharper readings more.
   Each visit tightens the spot toward ~1.5 m. Returns null when the reading is too far to be this palm. */
function mergeLoc(old, f) {
  if (!old) return { lat: f.lat, lng: f.lng, acc: f.acc, n: 1, w: 1 / (f.acc * f.acc), t: f.t };
  if (metres(old, f) > Math.max(8, 1.5 * (old.acc + f.acc))) return null;
  const w0 = old.w || 1 / (old.acc * old.acc), w1 = 1 / (f.acc * f.acc), W = w0 + w1;
  return { lat: +((old.lat * w0 + f.lat * w1) / W).toFixed(7), lng: +((old.lng * w0 + f.lng * w1) / W).toFixed(7),
    acc: Math.round(Math.max(1.5, 1 / Math.sqrt(W)) * 10) / 10, n: (old.n || 1) + 1, w: W, t: f.t };
}
let farTry = null;
$('pGpsBtn').onclick = async () => {
  if (!db || !curPalm) return; const id = curPalm, b = $('pGpsBtn'); b.disabled = true;
  try {
    const loc = await getLocation(x => { if (curPalm === id) $('pGps').textContent = t('gpsWorking', nf(x.acc, 0)); });
    if (!loc) { toast(t('gpsFail')); return; }
    const old = S.palms[id] && S.palms[id].loc;
    let g = mergeLoc(old, loc);
    if (!g) {
      if (farTry && farTry.id === id && Date.now() - farTry.t < 60000) { g = mergeLoc(null, loc); farTry = null; toast(t('gpsReplaced')); }
      else { farTry = { id, t: Date.now() }; toast(t('gpsFar', nf(metres(old, loc), 0))); return; }
    }
    await writePalm(id, body => { body.loc = g; }); buzz(25);
    if (curPalm === id) { $('pGps').textContent = gpsText({ loc: g }); $('pGpsBtn').textContent = t('gpsImprove'); }
  } catch { toast(t('gpsFail')); } finally { b.disabled = false; if (curPalm === id) renderPalm(); }
};

/* ---------- Tag palms: walk the farm and mark each palm's GPS spot ----------
   One palm is selected at a time. "Mark location here" averages 5-10 s of GPS and
   saves it as the palm's spot (palms/<id>.loc); a second mark close to the first is
   averaged in, a far one asks before replacing. Then the next untagged palm is selected. */
let tgBlock = null, tgN = 1, tgFix = null, tgStop = null, tgView = null, tgPicked = false;   // tgPicked: user chose a palm; until then follow the first untagged
const tgB = () => blockOf(tgBlock) || blocks()[0] || null;
const tgId = () => tgB() ? palmId(tgB().id, tgN) : null;
const locOf = id => S.palms[id] && S.palms[id].loc;
function showTag(on) {
  if (!on) { if (tgStop) { tgStop(); tgStop = null; } return; }
  const bs = blocks(); if (!bs.find(b => b.id === tgBlock)) { tgBlock = bs[0] ? bs[0].id : null; tgN = firstUntagged(1) || 1; }
  if (!tgStop) {
    $('tgGps').textContent = t('svWaiting'); $('tgDot').className = 'sv-dot';
    watchLocation(f => { tgFix = f; $('tgDot').className = 'sv-dot ' + (f.acc <= 5 ? 'g' : f.acc <= 8 ? 'a' : 'r'); $('tgGps').textContent = `GPS ±${nf(f.acc, 1)} m`; renderTagLive(); })
      .then(stop => { if (tab === 'tag') tgStop = stop; else stop(); }).catch(() => { $('tgGps').textContent = t('svGpsOff'); });
  }
  renderTag();
}
function firstUntagged(from) {
  const b = tgB(); if (!b) return null;
  for (let k = 0; k < +b.palms; k++) { const n = ((from - 1 + k) % +b.palms) + 1; if (!locOf(palmId(b.id, n))) return n; }
  return null;
}
function renderTag() {
  if (!tgBlock && blocks().length) tgBlock = blocks()[0].id;
  if (!tgPicked && tgB()) tgN = firstUntagged(1) || 1;
  const b = tgB();
  $('tgBlock').innerHTML = blocks().map(x => `<option value="${esc(x.id)}">${esc(x.id)}</option>`).join('');
  if (!b) { $('tgId').textContent = '—'; $('tgList').innerHTML = `<div class="hint">${esc(t('svNoBlock'))}</div>`; return; }
  $('tgBlock').value = b.id;
  tgN = Math.min(Math.max(1, tgN), +b.palms || 1);
  const id = tgId(), loc = locOf(id), rt = rowTreeOf(b, tgN);
  $('tgId').textContent = id;
  $('tgSub').textContent = rt ? t('rowTree', rt[0], rt[1]) : '';
  $('tgState').textContent = loc ? t('tgTagged', nf(loc.acc, 1)) : t('tgNot');
  $('tgState').className = 'sv-pill ' + (loc ? 'ok' : '');
  $('tgClear').hidden = !loc;
  $('tgPrev').disabled = tgN <= 1; $('tgNext').disabled = tgN >= +b.palms;
  let n = 0; for (let i = 1; i <= +b.palms; i++) if (locOf(palmId(b.id, i))) n++;
  $('tgCount').textContent = t('tgCount', nf(n), nf(+b.palms));
  $('tgBar').style.width = (b.palms ? 100 * n / b.palms : 0) + '%';
  // palm numbers grouped by field row (or lines of 20 before a layout exists)
  const groups = Array.isArray(b.rows) && b.rows.length ? b.rows : Array.from({ length: Math.ceil(+b.palms / 10) }, (_, i) => Math.min(10, +b.palms - i * 10));
  let h = '', k = 0;
  groups.forEach((c, r) => {
    h += `<div class="tg-row"><b>${Array.isArray(b.rows) && b.rows.length ? 'R' + (r + 1) : ''}</b><div>`;
    for (let j = 0; j < c; j++) { k++; const pid = palmId(b.id, k); h += `<button data-tg="${k}" class="${locOf(pid) ? 'on' : ''}${k === tgN ? ' cur' : ''}" aria-label="${pid}">${k}</button>`; }
    h += '</div></div>';
  });
  $('tgList').innerHTML = h;
  renderTagLive();
}
/* the parts that change with every GPS reading: distance line + map */
function renderTagLive() {
  if (tab !== 'tag') return;
  const b = tgB(); if (!b) return;
  const id = tgId(), loc = locOf(id);
  let msg = '';
  if (tgFix && loc) msg = t('tgAway', nf(metres(tgFix, loc), 1));
  else if (tgFix) { const nr = nearest(tgFix, 1)[0]; if (nr) msg = t('tgNearest', nr.id, nf(nr.d, 1)); }
  $('tgAway').textContent = msg;
  drawTagMap();
}
function drawTagMap() {
  const cv = $('tgMap'), g = cv.getContext('2d'), W = cv.width, H = cv.height, css = getComputedStyle(document.documentElement);
  const col = n => css.getPropertyValue(n).trim();
  g.clearRect(0, 0, W, H);
  const b = tgB(); if (!b) return;
  const pts = [];
  for (let i = 1; i <= +b.palms; i++) { const l = locOf(palmId(b.id, i)); if (l) pts.push({ ...l, n: i }); }
  if (!pts.length && !tgFix) { g.fillStyle = col('--muted'); g.font = '28px system-ui'; g.textAlign = 'center'; g.fillText(t('tgMapEmpty'), W / 2, H / 2); tgView = null; return; }
  const all = pts.slice(); if (tgFix) all.push(tgFix);
  const o = all[0], kx = 111320 * Math.cos(o.lat * Math.PI / 180), ky = 110540;
  const xy = p => [(p.lng - o.lng) * kx, -(p.lat - o.lat) * ky];
  const P = all.map(xy), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const pad = 8, minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const s = Math.min(W / Math.max(20, maxX - minX), H / Math.max(16, maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const sx = p => (xy(p)[0] - minX) * s + ox, sy = p => (xy(p)[1] - minY) * s + oy;
  const r = Math.max(5, Math.min(16, s * 1.8));
  for (const p of pts) {
    g.fillStyle = p.n === tgN ? col('--fruit') : col('--ok'); g.beginPath(); g.arc(sx(p), sy(p), p.n === tgN ? r * 1.35 : r, 0, 7); g.fill();
    if (r >= 9) { g.fillStyle = col('--leaf-ink'); g.font = `600 ${Math.round(r * 0.95)}px system-ui`; g.textAlign = 'center'; g.fillText(p.n, sx(p), sy(p) + r * 0.33); }
  }
  if (tgFix) {
    g.fillStyle = 'rgba(29,95,209,.18)'; g.beginPath(); g.arc(sx(tgFix), sy(tgFix), Math.max(6, tgFix.acc * s), 0, 7); g.fill();
    g.fillStyle = '#1d5fd1'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(sx(tgFix), sy(tgFix), 10, 0, 7); g.fill(); g.stroke();
  }
  g.fillStyle = col('--ink'); g.fillRect(16, H - 22, 10 * s, 5); g.font = '20px system-ui'; g.textAlign = 'left'; g.fillText('10 m', 16, H - 30);
  tgView = { pts: pts.map(p => ({ n: p.n, x: sx(p), y: sy(p) })) };
}
$('goTag').onclick = () => setTab('tag');
$('tgBack').onclick = () => setTab('palms');
$('tgBlock').onchange = e => { tgBlock = e.target.value; tgPicked = false; tgN = firstUntagged(1) || 1; renderTag(); };
$('tgPrev').onclick = () => { tgPicked = true; tgN--; renderTag(); };
$('tgNext').onclick = () => { tgPicked = true; tgN++; renderTag(); };
$('tgSkip').onclick = () => { tgPicked = true; const n = firstUntagged(tgN + 1); if (n) { tgN = n; renderTag(); } else toast(t('tgAll')); };
$('tgList').addEventListener('click', e => { const b = e.target.closest('[data-tg]'); if (b) { tgPicked = true; tgN = +b.dataset.tg; renderTag(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
$('tgMap').addEventListener('click', e => {
  if (!tgView || !tgView.pts.length) return;
  const rc = e.currentTarget.getBoundingClientRect(), x = (e.clientX - rc.left) * $('tgMap').width / rc.width, y = (e.clientY - rc.top) * $('tgMap').height / rc.height;
  let best = null, bd = 1e9; for (const p of tgView.pts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
  if (best && bd < 60) { tgPicked = true; tgN = best.n; renderTag(); }
});
$('tgClear').onclick = () => { const id = tgId(); confirmBox(t('tgClearAsk', id), async () => { try { await writePalm(id, body => { delete body.loc; }); } catch { toast(t('saveFailed')); } }); };
$('tgMark').onclick = async () => {
  if (!db) return;
  const id = tgId(), b = tgB(); if (!id) return;
  tgPicked = true;
  const fix = await averageGps(t('tgStand', id), t); if (!fix) return;
  const old = locOf(id), f = { lat: fix.lat, lng: fix.lng, acc: fix.acc, t: fix.t };
  const save = async (loc, msg) => {
    try { await writePalm(id, body => { body.loc = loc; }); buzz(30); toast(msg); } catch { toast(t('saveFailed')); return; }
    const n = firstUntagged(tgN + 1); if (n && b && tgB() && tgB().id === b.id) tgN = n; renderTag(); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const merged = mergeLoc(old, f);
  if (merged) return save(merged, old ? t('tgAveraged', id, nf(merged.acc, 1)) : t('tgSaved', id, nf(merged.acc, 1)));
  confirmBox(t('tgFarAsk', nf(metres(old, f), 0), id), () => save(mergeLoc(null, f), t('tgSaved', id, nf(f.acc, 1))));
};

/* ---------- find palm by GPS: auto-open within 2.5 m (8 ft) ---------- */
const NEAR_M = 2.5, NEAR_ACC = 5;
let nearMode = false, lastFix = null, gpsStop = null, gpsTok = 0, autoId = null;
function gpsSync() {
  const want = nearMode || !$('sheet').hidden;
  if (want && !gpsStop) {
    const tok = ++gpsTok; gpsStop = () => {};
    watchLocation(onFix).then(stop => { if (tok === gpsTok) gpsStop = stop; else stop(); }).catch(() => { if (tok === gpsTok) gpsStop = null; });
  } else if (!want && gpsStop) { gpsTok++; gpsStop(); gpsStop = null; lastFix = null; }
}
function nearest(fix, k = 3) {
  const out = [];
  for (const [id, p] of Object.entries(S.palms)) if (p && p.loc) out.push({ id, d: metres(fix, p.loc) });
  return out.sort((a, b) => a.d - b.d).slice(0, k);
}
function onFix(f) {
  lastFix = f;
  if (!nearMode) return;
  const list = nearest(f), have = list.length > 0;
  $('nearStat').textContent = !have ? t('nearNone') : f.acc > NEAR_ACC ? t('nearWeak', nf(f.acc, 0)) : t('nearAcc', nf(f.acc, 0));
  $('nearHead').hidden = !have || f.acc > NEAR_ACC;
  $('nearList').innerHTML = list.map(x => `<button class="chip" data-near="${esc(x.id)}">${esc(x.id)} · ${nf(x.d, 1)} m</button>`).join('');
  const [a, b] = list;
  if (a && a.d > NEAR_M + 1.5 && autoId === a.id) autoId = null;   // walked away: allow re-open later
  if (a && f.acc <= NEAR_ACC && a.d <= NEAR_M && (!b || b.d - a.d >= 2) && autoId !== a.id && $('sheet').hidden) {
    autoId = a.id; buzz([40, 60, 40]); openPalm(a.id, true); toast(t('nearOpened', a.id, nf(a.d, 1)));
  }
}
function renderNear() {
  $('nearBtn').textContent = t(nearMode ? 'nearStop' : 'nearBtn');
  $('nearBtn').classList.toggle('go', nearMode);
  $('nearOut').hidden = !nearMode;
}
/* GPS find runs by itself on the Count tab once any palm has a saved spot,
   unless the user switched it off this session. Other tabs stop it (saves battery). */
let nearOff = false;
function autoNear() {
  const want = tab === 'count' && !nearOff && Object.values(S.palms).some(p => p && p.loc);
  if (want === nearMode) return;
  nearMode = want; autoId = null;
  if (nearMode) { $('nearStat').textContent = t('nearWait'); $('nearList').innerHTML = ''; $('nearHead').hidden = true; if (lastFix) onFix(lastFix); }
  renderNear(); gpsSync();
}
$('nearBtn').onclick = () => {
  nearMode = !nearMode; autoId = null; nearOff = !nearMode;
  if (nearMode) { $('nearStat').textContent = t('nearWait'); $('nearList').innerHTML = ''; $('nearHead').hidden = true; if (lastFix) onFix(lastFix); }
  renderNear(); gpsSync();
};
$('nearList').addEventListener('click', e => { const b = e.target.closest('[data-near]'); if (b) { autoId = b.dataset.near; openPalm(b.dataset.near, true); } });
$('gpsExport').onclick = async () => {
  if (!downloads) return;
  const lines = ['palm_id,block,number,lat,lng,accuracy_m,readings,saved'];
  for (const b of blocks()) for (let i = 1; i <= (+b.palms || 0); i++) { const id = palmId(b.id, i), p = S.palms[id]; if (p && p.loc) lines.push([id, b.id, i, p.loc.lat, p.loc.lng, p.loc.acc, p.loc.n || 1, new Date(p.loc.t).toISOString()].join(',')); }
  try { await downloads.save({ filename: 'palm-gps.csv', data: new Blob([lines.join('\n')], { type: 'text/csv' }) }); } catch {}
};
const pend = {};
window.addEventListener('pbr:pending', e => { pend[e.detail.path] = e.detail.pending; $('syncNote').hidden = !Object.values(pend).some(Boolean); });
window.addEventListener('pbr:syncerror', () => toast(t('syncErr')));

/* ---------- field tools: survey, 3D, data backup ---------- */
async function saveFile(filename, blob) {
  if (downloads) { try { await downloads.save({ filename, data: blob }); return; } catch {} }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
async function saveLayout(blockId, rows, pos) {
  if (!db || !S.config) return;
  const cfg = JSON.parse(JSON.stringify(S.config)), b = (cfg.blocks || []).find(x => x.id === blockId); if (!b) return;
  b.rows = rows; b.diamond = true; b.pos = pos; b.palms = rows.reduce((a, c) => a + c, 0);
  try { await db.doc('config/farm').set(cfg); setupDraft = null; toast(t('layoutApplied')); setTab('palms'); } catch { toast(t('saveFailed')); }
}
$('goSurvey').onclick = () => setTab('survey');
$('svBack').onclick = () => setTab('palms');
for (const id of ['go3d1', 'go3d2']) $(id).onclick = e => { e.currentTarget.href = e.currentTarget.getAttribute('href').split('?')[0] + '?block=' + encodeURIComponent(mapBlock || ''); };
$('dataExport').onclick = async () => {
  const body = { app: 'palm-yield-tracker', kind: 'farm-data', exported: new Date().toISOString(), config: S.config, palms: S.palms, tickets: S.tickets, survey: {} };
  if (!isShared()) for (const [k, v] of Object.entries(localData.all())) if (k.startsWith('survey/')) body.survey[k.slice(7)] = v;
  await saveFile(`farm-data-${today()}.json`, new Blob([JSON.stringify(body)], { type: 'application/json' }));
};
$('dataImport').onclick = () => $('dataFile').click();
$('dataFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !db) return;
  let d; try { d = JSON.parse(await f.text()); if (!d || (typeof d.palms !== 'object' && !d.config)) throw 0; } catch { toast(t('dataBad')); return; }
  const palms = d.palms || {}, tickets = Array.isArray(d.tickets) ? d.tickets : [];
  confirmBox(t('dataAsk', nf(Object.keys(palms).length), nf(tickets.length)), async () => {
    let n = 0;
    try {
      if (d.config) { await db.doc('config/farm').set(d.config); n++; }
      for (const [id, p] of Object.entries(palms)) { await db.collection('palms').doc(id).set(p); n++; }
      for (const tk of tickets) { const { id, ...rest } = tk; if (id) await db.collection('tickets').doc(id).set(rest); else await db.collection('tickets').add(rest); n++; }
      for (const [blk, sv] of Object.entries(d.survey || {})) { await db.doc('survey/' + blk).set(sv); n++; }
      toast(t('dataLoaded', nf(n)));
    } catch { toast(t('saveFailed')); }
  });
};
$('dataUpload').onclick = () => {
  const n = Object.keys(localData.all()).length;
  confirmBox(t('dataUpAsk', nf(n)), async () => { try { toast(t('dataUploaded', nf(await uploadLocal()))); } catch { toast(t('saveFailed')); } });
};
function confirmBox(text, fn) {
  const el = $('svSheet');
  el.querySelector('.in').innerHTML = `<div class="sv-msg">${esc(text)}</div><button class="btn go" data-s="yes">${esc(t('yes'))}</button><button class="btn" data-s="no">${esc(t('svCancel'))}</button>`;
  el.hidden = false;
  el.onclick = e => { const b = e.target.closest('[data-s]'); if (!b && e.target !== el) return; el.hidden = true; if (b && b.dataset.s === 'yes') fn(); };
}

/* ---------- data ---------- */
async function start() {
  buildStageCounters();
  applyLang();
  renderNear();
  route(); if (!location.hash) setTab('count');
  const [dbNs, userNs, dl] = await Promise.all([claude.use('db'), claude.use('user'), claude.use('downloads')]);
  db = dbNs; downloads = dl;
  initSurvey({ db, blocks, canEdit: () => S.canEdit, toast, t, saveLayout, download: saveFile });
  $('dataMode').textContent = t(isShared() ? 'dataShared' : 'dataLocal');
  $('dataUpload').hidden = !(isShared() && S.canEdit && Object.keys(localData.all()).length);
  if (userNs) { S.uid = await userNs.id(); S.canEdit = await userNs.canEdit(); S.canWrite = await userNs.can('data.write'); }
  $('setupTab').hidden = !S.canEdit; $('tabs').classList.toggle('five', S.canEdit);
  if (!db) { banner(t('signedOut')); renderAll(); return; }
  if (S.canWrite === false) banner(t('readOnly'));
  const got = { cfg: false, palms: false, tk: false };
  const slow = setTimeout(() => { if (!got.cfg || !got.palms) banner(t('slow')); }, 10000);
  const settle = () => { if (got.cfg && got.palms && got.tk) { clearTimeout(slow); if ($('banner').textContent === t('slow')) banner(S.canWrite === false ? t('readOnly') : ''); } };
  db.doc('config/farm').onSnapshot(s => { S.config = s.exists ? s.data() : null; if (!s.metadata.fromCache) got.cfg = true; settle(); if (!S.config && got.cfg) banner(t('noConfig')); else if (S.config && $('banner').textContent === t('noConfig')) banner(''); renderAll(); route(); }, () => { got.cfg = true; settle(); });
  db.collection('palms').onSnapshot(s => { const m = {}; s.docs.forEach(d => m[d.id] = d.data()); S.palms = m; if (!s.metadata.fromCache) got.palms = true; settle(); renderAll(); }, () => { got.palms = true; settle(); });
  db.collection('tickets').onSnapshot(s => { S.tickets = s.docs.map(d => ({ id: d.id, ...d.data(), tonnes: +d.data().tonnes || 0, bunches: +d.data().bunches || 0 })).filter(x => x.date); if (!s.metadata.fromCache) got.tk = true; settle(); renderAll(); }, () => { got.tk = true; settle(); });
}
start();
// offline support on the website (the installed Android/iOS app has its files built in)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
