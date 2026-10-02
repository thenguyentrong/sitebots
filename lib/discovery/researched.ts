import type { OpportunitySeed } from './model';

// These source-backed opportunities extend the older construction task library.
// They link to configuration reviews because no assessed bilingual task record exists yet.
export const RESEARCHED_OPPORTUNITIES: OpportunitySeed[] = [
 { id:'research:bridge-deck-rebar-placement', title:'Place reinforcing bars on bridge decks',
   summary:'Lift and place transverse or longitudinal reinforcing bars at configured spacing. People set up, supervise and separate bars; tying remains separate.',
   industries:['construction'],family:'heavy_element_handling',clusterId:'handling',setting:'Bridge construction',href:'/solutions/acr-ironbot-rebar-placement',kind:'researched',
   reviewIds:['acr-ironbot-rebar-placement'],reviewLinks:[{taskId:'research:bridge-deck-rebar-placement',reviewId:'acr-ironbot-rebar-placement',relationship:'task_candidate',rationale:'Manufacturer product documentation and its Port St. Lucie case describe bridge-deck bar placement.',sourceIds:['ironbot-product','ironbot-port'],limitations:['Crew establishes the first bar position, sets spacing and singulates bars.','Tying, cage fabrication and German project acceptance are outside this reviewed placement task.']}]},
 { id:'research:carton-palletizing',title:'Stack prepared cartons onto pallets',
   summary:'Pick presented cartons and place them in a programmed pallet pattern. Confirm the complete arm, gripper, infeed and safeguarding package.',
   industries:['manufacturing','warehousing'],family:'packaging_palletising_loading',clusterId:'handling',setting:'End-of-line packaging',href:'/workflows/material_handling',kind:'researched',
   reviewIds:['robotiq-ax20-palletizing','abb-irb460-110-240-palletizing'],reviewLinks:[
    {taskId:'research:carton-palletizing',reviewId:'robotiq-ax20-palletizing',relationship:'task_candidate',rationale:'The AX20 product sheet describes patterned box palletizing.',sourceIds:['sheet','product'],limitations:['Review carton material, pattern and gripping limits.','The reviewed German module listing excludes the robot arm.']},
    {taskId:'research:carton-palletizing',reviewId:'abb-irb460-110-240-palletizing',relationship:'task_candidate',rationale:'ABB lists end-of-line palletizing for the IRB 460.',sourceIds:['product'],limitations:['A configured gripper, fixtures, infeed and safeguarding are required.','Arm payload does not establish carton throughput or grip reliability.']}]},
 { id:'research:warehouse-bin-picking',title:'Pick warehouse items from storage bins',
   summary:'Identify and transfer supported items from presented storage bins into a configured outbound container. Review SKU coverage and human recovery.',
   industries:['warehousing'],family:'kitting_picking_sorting',clusterId:'handling',setting:'Warehouse picking station',href:'/solutions/nomagic-pick-bin-picking',kind:'researched',
   reviewIds:['nomagic-pick-bin-picking'],reviewLinks:[{taskId:'research:warehouse-bin-picking',reviewId:'nomagic-pick-bin-picking',relationship:'task_candidate',rationale:'Nomagic describes AutoStore-bin picking into adapted trolleys at Fiege.',sourceIds:['product','deployment'],limitations:['The deployment used customer-specific containers, integration and recovery.','Exact hardware revision and performance for a new SKU assortment remain unconfirmed.']}]},
];
