import { figureData } from '../data.js';

export const SANS = 'Inter, system-ui, sans-serif';
export const MATH = 'KaTeX_Main, Georgia, serif';

const TYPE = figureData.type;
const L = figureData.labels;
const W = figureData.wires;

let measurer = null;

function textWidth(text, size, weight) {
  if (!measurer) measurer = document.createElement('canvas').getContext('2d');
  measurer.font = `${weight} ${size}px ${SANS}`;
  return measurer.measureText(text).width;
}

export function buildDrawing(cfg, narrow) {
  return narrow ? narrowDrawing(cfg) : wideDrawing(cfg);
}

function wideDrawing(cfg) {
  const g = figureData.grid.wide;
  const { box, adv, gap, row, plate } = g;
  const hw = box.w / 2;
  const hh = box.h / 2;
  const plateH = TYPE.edge.size + 2 * plate.padY;
  const off = plate.gap + plateH / 2;

  const x0 = g.pad;
  const y0 = g.pad;
  const advR = x0 + adv.w;
  const advX = x0 + adv.w / 2;
  const laneX = advR + gap.advToLane + hw;
  const compilerX = laneX + box.w + gap.laneToCompiler;
  const busX = compilerX + hw + gap.compilerToBus;
  const spineX = busX + gap.busToSpine + hw;
  const turnX = busX + gap.busToSpine / 2;

  const mY = y0 + hh;
  const signTop = mY + hh + row.spineToBoundary;
  const laneKeyTop = signTop + row.boundaryPad;
  const upperY = laneKeyTop + row.regionPad + hh;
  const laneKeyBot = upperY + hh + row.regionPad;
  const detY = laneKeyBot + row.laneToSpine + hh;
  const laneRndTop = detY + hh + row.laneToSpine;
  const lowerY = laneRndTop + row.regionPad + hh;
  const laneRndBot = lowerY + hh + row.regionPad;
  const signBot = laneRndBot + row.boundaryPad;
  const sY = signBot + row.spineToBoundary + hh;
  const interLaneY = (laneKeyBot + detY - hh) / 2;

  const keyReachY = mY + hh + off;
  const randReachY = sY - hh - off;
  const signL = laneX + hw + gap.laneToCompiler / 2;
  const signR = spineX + hw + row.boundaryPad;
  const laneL = laneX - hw - row.regionPad;
  const laneR = compilerX + hw + row.regionPad;
  const advTop = mY - hh - adv.pad;
  const advBot = sY + hh + adv.pad;
  const detW = spineX - hw;
  const busY = signTop + row.boundaryPad;
  const busIn = -g.laneExit;
  const skTapX = laneX + box.w * 0.3;
  const trTapX = compilerX - box.w * 0.3;

  const d = {
    stage: { w: signR + g.pad, h: sY + hh + g.pad },
    corner: g.corner,
    plateRadius: g.plate.radius,
    port: g.port,
    boxes: [],
    regions: [],
    ports: [],
    plates: [],
    texts: [],
    routes: [],
    reached: []
  };

  const boxAt = (id, x, y, label, font) => d.boxes.push({ id, x, y, w: box.w, h: box.h, label, font });
  boxAt('m', spineX, mY, W.m, 'math');
  boxAt('sk', laneX, upperY, 'sk', 'box');
  boxAt('genR', laneX, lowerY, 'GenR', 'box');
  boxAt('det', spineX, detY, L.detComp, 'box');
  boxAt('s', spineX, sY, W.s, 'math');
  if (cfg.showGenTsk) boxAt('genTsk', compilerX, upperY, 'GenTsk', 'box');
  if (cfg.showGenTr) boxAt('genTr', compilerX, lowerY, 'GenTr', 'box');
  d.boxes.push({ id: 'adv', x: advX, y: (advTop + advBot) / 2, w: adv.w, h: advBot - advTop, label: L.adversary, font: 'adv' });

  const region = (id, x1, y1, x2, y2) => d.regions.push({ id, x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 });
  region('sign', signL, signTop, signR, signBot);
  region('laneKey', laneL, laneKeyTop, laneR, laneKeyBot);
  region('laneRnd', laneL, laneRndTop, laneR, laneRndBot);

  d.texts.push({ id: 'signName', x: signL + row.boundaryPad, y: signTop + row.boundaryPad / 2, text: L.algorithm, family: 'boundary' });
  d.texts.push({ id: 'laneKeyName', x: laneL + row.regionPad, y: laneKeyBot - row.regionPad / 2, text: L.keyDerivation, family: 'region', of: 'laneKey' });
  d.texts.push({ id: 'laneRndName', x: laneL + row.regionPad, y: laneRndBot - row.regionPad / 2, text: L.randomnessGeneration, family: 'region', of: 'laneRnd' });

  const port = (id, x, y) => d.ports.push({ id, x, y });
  port('pSpineIn', spineX, signTop);
  port('pKeyIn', signL, upperY);
  port('pRndIn', signL, lowerY);
  port('pSpineOut', spineX, signBot);
  if (cfg.showGenTr) port('pSkTr', signL, interLaneY);

  const route = (id, from, to, sep, tep, pts, family, both) =>
    d.routes.push({ id, from, to, sep, tep, pts, family, both: !!both });
  const p = (x, y) => ({ x, y });

  route('D1', 'm', 'det', [0, hh], [0, -hh], [p(spineX, mY + hh), p(spineX, detY - hh)], 'algo');
  const busTo = (id, target, ty) => route(id, 'm', target, [0, hh], [hw, busIn],
    [p(spineX, mY + hh), p(spineX, busY), p(busX, busY), p(busX, ty), p(compilerX + hw, ty)], 'algo');
  if (cfg.showGenTsk) busTo('D2tsk', 'genTsk', upperY + busIn);
  if (cfg.showGenTr) busTo('D2tr', 'genTr', lowerY + busIn);

  if (cfg.showGenTsk) {
    route('D3', 'sk', 'genTsk', [hw, 0], [-hw, 0], [p(laneX + hw, upperY), p(compilerX - hw, upperY)], 'supply');
  } else {
    route('D3', 'sk', 'det', [hw, 0], [-hw, -g.detEntry],
      [p(laneX + hw, upperY), p(turnX, upperY), p(turnX, detY - g.detEntry), p(detW, detY - g.detEntry)], 'supply');
  }
  if (cfg.showGenTr) {
    route('D4', 'sk', 'genTr', [box.w * 0.3, hh], [-box.w * 0.3, -hh],
      [p(skTapX, upperY + hh), p(skTapX, interLaneY), p(trTapX, interLaneY), p(trTapX, lowerY - hh)], 'supply');
  }
  if (cfg.showGenTsk) {
    route('D5', 'genTsk', 'det', [hw, g.laneExit], [-hw, -g.detEntry],
      [p(compilerX + hw, upperY + g.laneExit), p(turnX, upperY + g.laneExit), p(turnX, detY - g.detEntry), p(detW, detY - g.detEntry)], 'supply');
  }
  if (cfg.showGenTr) {
    route('D6', 'genR', 'genTr', [hw, 0], [-hw, 0], [p(laneX + hw, lowerY), p(compilerX - hw, lowerY)], 'supply');
  } else {
    route('D6', 'genR', 'det', [hw, 0], [-hw, g.detEntry],
      [p(laneX + hw, lowerY), p(turnX, lowerY), p(turnX, detY + g.detEntry), p(detW, detY + g.detEntry)], 'supply');
  }
  if (cfg.showGenTsk && cfg.showGenTr) {
    route('D7', 'genTr', 'genTsk', [0, -hh], [0, hh], [p(compilerX, lowerY - hh), p(compilerX, upperY + hh)], 'supply');
  }
  if (cfg.showGenTr) {
    route('D8', 'genTr', 'det', [hw, g.laneExit], [-hw, g.detEntry],
      [p(compilerX + hw, lowerY + g.laneExit), p(turnX, lowerY + g.laneExit), p(turnX, detY + g.detEntry), p(detW, detY + g.detEntry)], 'supply');
  }
  route('D9', 'det', 's', [0, hh], [0, -hh], [p(spineX, detY + hh), p(spineX, sY - hh)], 'algo');

  const plateW = (text) => Math.ceil(textWidth(text, TYPE.edge.size, TYPE.edge.weight)) + 2 * plate.padX;
  const plateAt = (id, text, cx, cy, kind, tip) =>
    d.plates.push({ id, text, x: cx, y: cy, w: plateW(text), h: plateH, kind, tip });

  const alongH = (id, text, x1, x2, y, f, side) => plateAt(id, text, x1 + f * (x2 - x1), y + side * off, 'wire');
  const alongV = (id, text, y1, y2, x, f, side) =>
    plateAt(id, text, x + side * (plate.gap + plateW(text) / 2), y1 + f * (y2 - y1), 'wire');

  const reachPlate = (id, text, y, tip) =>
    plateAt(id, text, advR + plate.gap + plateW(text) / 2, y, 'reach', tip);

  const wireX = laneX + hw + gap.laneToCompiler * 0.22;
  alongV('L-m', W.m, mY + hh, detY - hh, spineX, 0.78, 1);
  alongV('L-s', W.s, detY + hh, sY - hh, spineX, 0.22, 1);
  alongH('L-sk', W.sk, wireX, wireX, upperY, 0, -1);
  alongH('L-r', W.r, wireX, wireX, lowerY, 0, -1);
  if (cfg.showGenTr) alongH('L-skTr', W.sk, skTapX, trTapX, interLaneY, 0.78, 1);
  if (cfg.showGenTsk) {
    alongV('L-vk', W.vk, upperY + g.laneExit, detY - g.detEntry, turnX, 0.24, 1);
    alongV('L-tsk', W.tsk, upperY + g.laneExit, detY - g.detEntry, turnX, 0.66, 1);
  }
  if (cfg.showGenTsk && cfg.showGenTr) alongV('L-tr1', W.tr1, lowerY - hh, upperY + hh, compilerX, 0.5, 1);
  if (cfg.showGenTr) alongV('L-tr2', W.tr2, lowerY + g.laneExit, detY + g.detEntry, turnX, 0.68, 1);

  if (cfg.showClassic) {
    route('R1', 'adv', 'm', [adv.w / 2, mY - (advTop + advBot) / 2], [-hw, 0], [p(advR, mY), p(spineX - hw, mY)], 'attack', true);
    route('R2', 'adv', 's', [adv.w / 2, sY - (advTop + advBot) / 2], [-hw, 0], [p(advR, sY), p(spineX - hw, sY)], 'attack', true);
    reachPlate('A-classic', cfg.attackLabel, mY - off, cfg.classicDetail);
  }
  if (cfg.showLeakage) {
    d.boxes.push({ id: 'aKey', x: laneX, y: laneKeyTop, w: 1, h: 1, label: '', font: 'anchor' });
    route('R3', 'adv', 'aKey', [adv.w / 2, keyReachY - (advTop + advBot) / 2], [0, 0],
      [p(advR, keyReachY), p(laneX, keyReachY), p(laneX, laneKeyTop)], 'attack', true);
    reachPlate('A-leak', cfg.leakageAttackLabel, keyReachY - off, cfg.leakageDetail);
  }
  if (cfg.showRandom) {
    d.boxes.push({ id: 'aRnd', x: laneX, y: laneRndBot, w: 1, h: 1, label: '', font: 'anchor' });
    route('R4', 'adv', 'aRnd', [adv.w / 2, randReachY - (advTop + advBot) / 2], [0, 0],
      [p(advR, randReachY), p(laneX, randReachY), p(laneX, laneRndBot)], 'attack', true);
    reachPlate('A-rand', cfg.randomnessAttackLabel, randReachY + off, cfg.randomnessDetail);
  }

  markReached(d, cfg);
  return d;
}

function narrowDrawing(cfg) {
  const g = figureData.grid.narrow;
  const { box, adv, gap, row, plate } = g;
  const hw = box.w / 2;
  const hh = box.h / 2;
  const plateH = TYPE.edge.size + 2 * plate.padY;
  const off = plate.gap + plateH / 2;

  const x0 = g.pad;
  const advR = x0 + adv.w;
  const advX = x0 + adv.w / 2;
  const colL = advR + gap.advToCol;
  const colR = colL + box.w;
  const colX = colL + hw;
  const signL = colL - row.boundaryPad;
  const signR = colR + row.boundaryPad;
  const lane = (i) => colR + gap.colToGutter + i * gap.lane;

  let y = g.pad;
  const stack = (h) => { const c = y + h / 2; y += h + row.step; return c; };
  const mY = stack(box.h);
  const capKeyY = stack(row.captionH);
  const skY = stack(box.h);
  const capRndY = stack(row.captionH);
  const genRY = stack(box.h);

  const signTop = y;
  const genTrY = signTop + row.boundaryPad + hh;
  const genTskY = genTrY + box.h + row.step;
  const detY = genTskY + box.h + row.step;
  const signBot = detY + hh + row.boundaryPad;
  const sY = signBot + row.step + hh;
  const advTop = mY - hh - adv.pad;
  const advBot = sY + hh + adv.pad;

  const d = {
    stage: { w: lane(g.gutterLanes - 1) + g.pad, h: sY + hh + g.pad },
    corner: g.corner,
    plateRadius: g.plate.radius,
    port: g.port,
    boxes: [],
    regions: [],
    ports: [],
    plates: [],
    texts: [],
    routes: [],
    reached: []
  };

  const boxAt = (id, cy, label, font) => d.boxes.push({ id, x: colX, y: cy, w: box.w, h: box.h, label, font });
  boxAt('m', mY, W.m, 'math');
  boxAt('sk', skY, 'sk', 'box');
  boxAt('genR', genRY, 'GenR', 'box');
  boxAt('det', detY, L.detComp, 'box');
  boxAt('s', sY, W.s, 'math');
  if (cfg.showGenTr) boxAt('genTr', genTrY, 'GenTr', 'box');
  if (cfg.showGenTsk) boxAt('genTsk', genTskY, 'GenTsk', 'box');
  d.boxes.push({ id: 'adv', x: advX, y: (advTop + advBot) / 2, w: adv.w, h: advBot - advTop, label: L.adversary, font: 'adv' });

  d.boxes.push({ id: 'laneKey', x: colL, y: capKeyY, w: 1, h: row.captionH, label: '', font: 'anchor' });
  d.boxes.push({ id: 'laneRnd', x: colL, y: capRndY, w: 1, h: row.captionH, label: '', font: 'anchor' });
  d.texts.push({ id: 'laneKeyName', x: colL + plate.gap, y: capKeyY, text: L.keyDerivation, family: 'region', of: 'laneKey' });
  d.texts.push({ id: 'laneRndName', x: colL + plate.gap, y: capRndY, text: L.randomnessGeneration, family: 'region', of: 'laneRnd' });

  d.regions.push({ id: 'sign', x: (signL + signR) / 2, y: (signTop + signBot) / 2, w: signR - signL, h: signBot - signTop });
  d.texts.push({ id: 'signName', x: signL + row.boundaryPad, y: signTop + row.boundaryPad / 2, text: L.algorithm, family: 'boundary' });

  const route = (id, from, to, sep, tep, pts, family, both) =>
    d.routes.push({ id, from, to, sep, tep, pts, family, both: !!both });
  const p = (x, y2) => ({ x, y: y2 });
  const ports = [];

  const spine = (id, from, to, y1, y2, family) => {
    route(id, from, to, [0, hh], [0, -hh], [p(colX, y1), p(colX, y2)], family);
    if (y1 < signTop && y2 > signTop) ports.push(p(colX, signTop));
    if (y1 < signBot && y2 > signBot) ports.push(p(colX, signBot));
  };

  const laneRoute = (id, from, to, y1, i, targetY, entry, family) => {
    const ty = targetY + entry;
    route(id, from, to, [hw, 0], [hw, entry], [p(colR, y1), p(lane(i), y1), p(lane(i), ty), p(colR, ty)], family);
  };

  const e = g.detEntry;
  laneRoute('D1', 'm', 'det', mY, 0, detY, -e, 'algo');
  if (cfg.showGenTsk) laneRoute('D2tsk', 'm', 'genTsk', mY, 0, genTskY, -e, 'algo');
  if (cfg.showGenTr) laneRoute('D2tr', 'm', 'genTr', mY, 0, genTrY, -e, 'algo');

  if (cfg.showGenTsk) laneRoute('D3', 'sk', 'genTsk', skY, 1, genTskY, e, 'supply');
  else laneRoute('D3', 'sk', 'det', skY, 1, detY, e, 'supply');
  if (cfg.showGenTr) laneRoute('D4', 'sk', 'genTr', skY, 1, genTrY, e, 'supply');

  if (cfg.showGenTr) {
    spine('D6', 'genR', 'genTr', genRY + hh, genTrY - hh, 'supply');
  } else if (cfg.showGenTsk) {
    laneRoute('D6', 'genR', 'det', genRY, 2, detY, e, 'supply');
  } else {
    spine('D6', 'genR', 'det', genRY + hh, detY - hh, 'supply');
  }
  if (cfg.showGenTsk && cfg.showGenTr) spine('D7', 'genTr', 'genTsk', genTrY + hh, genTskY - hh, 'supply');
  if (cfg.showGenTsk) spine('D5', 'genTsk', 'det', genTskY + hh, detY - hh, 'supply');
  if (cfg.showGenTr && cfg.showGenTsk) laneRoute('D8', 'genTr', 'det', genTrY, 2, detY, e, 'supply');
  else if (cfg.showGenTr) spine('D8', 'genTr', 'det', genTrY + hh, detY - hh, 'supply');
  spine('D9', 'det', 's', detY + hh, sY - hh, 'algo');

  ports.forEach((pt, i) => d.ports.push({ id: `p${i}`, x: pt.x, y: pt.y }));

  const plateW = (text) => Math.ceil(textWidth(text, TYPE.edge.size, TYPE.edge.weight)) + 2 * plate.padX;
  const plateAt = (id, text, cx, cy, kind, tip) =>
    d.plates.push({ id, text, x: cx, y: cy, w: plateW(text), h: plateH, kind, tip });

  const laneLabel = (id, text, targetY, entry) =>
    plateAt(id, text, signR + plate.gap + plateW(text) / 2, targetY + entry + Math.sign(entry) * off, 'wire');

  const spineLabel = (id, text, y1, y2, side) =>
    plateAt(id, text, colX + side * (plate.gap + g.port / 2 + plateW(text) / 2), (y1 + y2) / 2, 'wire');

  laneLabel('L-m', W.m, detY, -e);
  laneLabel('L-sk', W.sk, cfg.showGenTsk ? genTskY : detY, e);
  if (cfg.showGenTr) laneLabel('L-skTr', W.sk, genTrY, e);
  if (cfg.showGenTr) {
    spineLabel('L-r', W.r, genRY + hh, Math.min(signTop, genTrY - hh), 1);
  } else if (cfg.showGenTsk) {
    laneLabel('L-r', W.r, detY, e);
  } else {
    spineLabel('L-r', W.r, genRY + hh, signTop, 1);
  }
  if (cfg.showGenTsk) {
    spineLabel('L-tsk', W.tsk, genTskY + hh, detY - hh, 1);
    spineLabel('L-vk', W.vk, genTskY + hh, detY - hh, -1);
  }
  if (cfg.showGenTsk && cfg.showGenTr) spineLabel('L-tr1', W.tr1, genTrY + hh, genTskY - hh, 1);
  if (cfg.showGenTr) {
    if (cfg.showGenTsk) laneLabel('L-tr2', W.tr2, detY, e);
    else spineLabel('L-tr2', W.tr2, genTrY + hh, detY - hh, 1);
  }
  spineLabel('L-s', W.s, signBot, sY - hh, 1);

  const advCY = (advTop + advBot) / 2;
  const reachRow = (id, target, ty, tx) =>
    route(id, 'adv', target, [adv.w / 2, ty - advCY], [tx, 0], [p(advR, ty), p(colL, ty)], 'attack', true);

  const reachPlate = (id, text, top, tip) =>
    plateAt(id, text, advR + plate.gap + plateW(text) / 2, top, 'reach', tip);

  if (cfg.showClassic) {
    reachRow('R1', 'm', mY, -hw);
    reachRow('R2', 's', sY, -hw);
    reachPlate('A-classic', cfg.attackLabel, mY + hh + row.step / 2, cfg.classicDetail);
  }
  if (cfg.showLeakage) {
    reachRow('R3', 'laneKey', capKeyY, 0);
    reachPlate('A-leak', cfg.leakageAttackLabel, capKeyY + row.captionH / 2 + row.step / 2, cfg.leakageDetail);
  }
  if (cfg.showRandom) {
    reachRow('R4', 'laneRnd', capRndY, 0);
    reachPlate('A-rand', cfg.randomnessAttackLabel, capRndY + row.captionH / 2 + row.step / 2, cfg.randomnessDetail);
  }

  markReached(d, cfg);
  return d;
}

function markReached(d, cfg) {
  if (cfg.showClassic) d.reached.push('m', 's');
  if (cfg.showRandom) d.reached.push('genR', 'laneRnd');
  if (cfg.showLeakage) {
    d.reached.push('laneKey');
    if (cfg.showGenTsk) d.reached.push('genTsk');
  }
}
