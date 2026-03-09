/**
 * Remote image URLs for Concordia campus buildings.
 *
 * Images are served directly from Concordia's website so no local download is
 * required. Each key is a building code matching the ones used in buildingInfo.js.
 *
 * URLs were extracted from https://www.concordia.ca/maps/buildings.html and each
 * individual building page (e.g. https://www.concordia.ca/maps/buildings/ev.html).
 */

const BASE = 'https://www.concordia.ca';

export const BUILDING_IMAGE_URLS = {
  // ─── SGW Campus ───────────────────────────────────────────────────────────
  B: `${BASE}/content/concordia/en/maps/buildings/b/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750701724050.jpg`,
  CI: `${BASE}/content/concordia/en/maps/buildings/ci/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750700006681.jpg`,
  CL: `${BASE}/content/concordia/en/maps/buildings/cl/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702106400.jpg`,
  D: `${BASE}/content/concordia/en/maps/buildings/d/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702147171.jpg`,
  EN: `${BASE}/content/concordia/en/maps/buildings/en/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702290723.jpg`,
  ER: `${BASE}/content/concordia/en/maps/buildings/er/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702362372.jpg`,
  EV: `${BASE}/content/concordia/en/maps/buildings/ev/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702823530.jpg`,
  FA: `${BASE}/content/concordia/en/maps/buildings/fa/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702940372.jpg`,
  FB: `${BASE}/content/concordia/en/maps/buildings/fb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703069703.jpg`,
  FG: `${BASE}/content/concordia/en/maps/buildings/fg/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703205424.jpg`,
  GA: `${BASE}/content/concordia/en/maps/buildings/ga/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703691368.jpg`,
  GM: `${BASE}/content/concordia/en/maps/buildings/gm/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703493618.jpg`,
  GN: `${BASE}/content/concordia/en/maps/buildings/gn/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703536218.jpg`,
  // Grey Nuns sub-wings share the main GN building image
  GNA: `${BASE}/content/concordia/en/maps/buildings/gn/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703536218.jpg`,
  GNB: `${BASE}/content/concordia/en/maps/buildings/gn/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703536218.jpg`,
  GNH: `${BASE}/content/concordia/en/maps/buildings/gn/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703536218.jpg`,
  GS: `${BASE}/content/concordia/en/maps/buildings/gs/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1753390286932.jpg`,
  H: `${BASE}/content/concordia/en/maps/buildings/h/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703745830.jpg`,
  K: `${BASE}/content/concordia/en/maps/buildings/k/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750704193887.jpg`,
  LB: `${BASE}/content/concordia/en/maps/buildings/lb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750706334758.jpg`,
  LD: `${BASE}/content/concordia/en/maps/buildings/ld/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750704279111.jpg`,
  LS: `${BASE}/content/concordia/en/maps/buildings/ls/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750704406530.jpg`,
  M: `${BASE}/content/concordia/en/maps/buildings/m/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750704516786.jpg`,
  MB: `${BASE}/content/concordia/en/maps/buildings/mb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1752848969887.jpg`,
  MI: `${BASE}/content/concordia/en/maps/buildings/mi/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750706431105.jpg`,
  MU: `${BASE}/content/concordia/en/maps/buildings/mu/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750706503707.jpg`,
  P: `${BASE}/content/concordia/en/maps/buildings/p/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750706979083.jpg`,
  PR: `${BASE}/content/concordia/en/maps/buildings/pr/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750707056205.jpg`,
  Q: `${BASE}/content/concordia/en/maps/buildings/q/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750707299714.jpg`,
  R: `${BASE}/content/concordia/en/maps/buildings/r/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750712426828.jpg`,
  RR: `${BASE}/content/concordia/en/maps/buildings/rr/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750773247509.jpg`,
  S: `${BASE}/content/concordia/en/maps/buildings/s/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750774186296.jpg`,
  SB: `${BASE}/content/concordia/en/maps/buildings/sb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750774358727.jpg`,
  T: `${BASE}/content/concordia/en/maps/buildings/t/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750775449149.jpg`,
  TD: `${BASE}/content/concordia/en/maps/buildings/td/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1753213459658.jpg`,
  V: `${BASE}/content/concordia/en/maps/buildings/v/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750775826854.jpg`,
  VA: `${BASE}/content/concordia/en/maps/buildings/va/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750775886127.jpg`,
  X: `${BASE}/content/concordia/en/maps/buildings/x/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750776118230.jpg`,
  Z: `${BASE}/content/concordia/en/maps/buildings/z/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750776165500.jpg`,

  // ─── Loyola Campus ────────────────────────────────────────────────────────
  AD: `${BASE}/content/concordia/en/maps/buildings/ad/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750701647513.jpg`,
  BB: `${BASE}/content/concordia/en/maps/buildings/bb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1754505281032.jpg`,
  BH: `${BASE}/content/concordia/en/maps/buildings/bh/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1754505255461.jpg`,
  CC: `${BASE}/content/concordia/en/maps/buildings/cc/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750701910958.jpg`,
  CJ: `${BASE}/content/concordia/en/maps/buildings/cj/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702027234.jpg`,
  // CJ sub-wings share the main CJ building image
  CJA: `${BASE}/content/concordia/en/maps/buildings/cj/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702027234.jpg`,
  CJN: `${BASE}/content/concordia/en/maps/buildings/cj/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702027234.jpg`,
  CJS: `${BASE}/content/concordia/en/maps/buildings/cj/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702027234.jpg`,
  DO: `${BASE}/content/concordia/en/maps/buildings/do/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750702189668.jpg`,
  FC: `${BASE}/content/concordia/en/maps/buildings/fc/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703132721.jpg`,
  GE: `${BASE}/content/concordia/en/maps/buildings/ge/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1752776070279.jpg`,
  HA: `${BASE}/content/concordia/en/maps/buildings/ha/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703805691.jpg`,
  HB: `${BASE}/content/concordia/en/maps/buildings/hb/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703951339.jpg`,
  HC: `${BASE}/content/concordia/en/maps/buildings/hc/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750703989751.jpg`,
  HU: `${BASE}/content/concordia/en/maps/buildings/hu/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1752777007725.jpg`,
  JR: `${BASE}/content/concordia/en/maps/buildings/jr/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1752775378408.jpg`,
  PC: `${BASE}/content/concordia/en/maps/buildings/pc/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1754056606860.jpg`,
  PS: `${BASE}/content/concordia/en/maps/buildings/ps/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1753211858581.jpg`,
  PT: `${BASE}/content/concordia/en/maps/buildings/pt/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750712426795.jpg`,
  PY: `${BASE}/content/concordia/en/maps/buildings/py/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750712426337.jpg`,
  QA: `${BASE}/content/concordia/en/maps/buildings/qa/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750712426399.jpg`,
  RA: `${BASE}/content/concordia/en/maps/buildings/ra/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1753387180607.jpg`,
  RF: `${BASE}/content/concordia/en/maps/buildings/rf/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1754321077294.jpg`,
  SC: `${BASE}/content/concordia/en/maps/buildings/sc/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750774420596.jpg`,
  SH: `${BASE}/content/concordia/en/maps/buildings/sh/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750774494391.jpg`,
  SI: `${BASE}/content/concordia/en/maps/buildings/si/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750774594857.jpg`,
  SP: `${BASE}/content/concordia/en/maps/buildings/sp/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1753215175111.jpg`,
  TA: `${BASE}/content/concordia/en/maps/buildings/ta/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1759152574654.jpg`,
  VE: `${BASE}/content/concordia/en/maps/buildings/ve/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1754323922442.jpg`,
  VL: `${BASE}/content/concordia/en/maps/buildings/vl/_jcr_content/content-main/grid_container_307846512/grid-container-parsys/box_427340212/box-parsys/image.img.jpg/1750775944461.jpg`,
};
