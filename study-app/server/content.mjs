import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const appRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const documents=JSON.parse(fs.readFileSync(path.join(appRoot,'content/curriculum.json'),'utf8'));
const subjectNames={english:'English Standard',maths:'Mathematics Advanced',extension:'Mathematics Extension 1',biology:'Biology',physics:'Physics',software:'Software Engineering',tafe:'Information and Digital Technology'};
export const subjects=[...documents.map(d=>({id:d.id,name:subjectNames[d.id],version:d.version,provisional:d.provisional,provider:d.provider,pending:false})),{id:'tafe',name:subjectNames.tafe,pending:true,placeConfirmed:false,provider:'TAFE NSW',version:null}];
const seeds=[];
function add(id,subject,title,prerequisites,lesson,example,hint,variants){
 const skill={id,subject,title,prerequisites,lesson,example,hint,year:10,foundation:true,sourceCode:null,sourceUrl:documents.find(d=>d.id===subject).contentUrl,provenance:'Authored preparation skill; prerequisite mapping is not an official NESA requirement',order:seeds.length,variants};seeds.push(skill);
}
const n=(prompt,answer,unit='')=>({prompt,answer:String(answer),numeric:Number(answer),unit,kind:'numeric'});
const t=(prompt,answer,aliases=[])=>({prompt,answer,aliases,kind:'exact'});
const r=(prompt,answer,criteria)=>({prompt,answer,criteria,kind:'rubric'});
add('maths-linear','maths','Solve a linear equation',[],
 'An equation stays balanced when you apply the same operation to both sides. Undo addition or subtraction first, then multiplication or division. Substitute your result back to check.',
 '3x + 5 = 20 → 3x = 15 → x = 5. Check: 3 × 5 + 5 = 20.', 'What operation would remove the constant term from both sides?',
 [n('Solve 4x + 7 = 31. Give the value of x.',6),n('Solve 5x − 8 = 27. Give the value of x.',7),n('A subscription costs $9 plus $3 per month. The total is $36. How many months?',9),n('Solve 7x + 2 = 37.',5)]);
add('maths-gradient','maths','Find the gradient of a line',['maths-linear'],
 'Gradient measures the change in y for each unit change in x: m = (y₂ − y₁)/(x₂ − x₁). Keep the point order the same in the numerator and denominator.',
 'Between (1, 3) and (5, 11), m = (11 − 3)/(5 − 1) = 2.', 'Find the vertical change and divide it by the horizontal change.',
 [n('Find the gradient through (2, 4) and (6, 16).',3),n('Find the gradient through (−1, 7) and (3, −1).',-2),n('A line rises 15 units over a horizontal distance of 6 units. What is its gradient?',2.5)]);
add('maths-powers','maths','Apply index laws',[],
 'When multiplying powers of the same base, add exponents. When dividing, subtract exponents. A power raised to another power multiplies exponents.',
 'x³ × x⁴ = x⁷; (x³)² = x⁶; x⁷ ÷ x² = x⁵, for x ≠ 0.', 'Are you multiplying powers, dividing powers, or raising a power to another power?',
 [n('Simplify x³ × x⁵ to xⁿ. What is n?',8),n('Simplify (x⁴)³ to xⁿ. What is n?',12),n('For x ≠ 0, simplify x⁹ ÷ x⁴ to xⁿ. What is n?',5)]);
add('extension-factor','extension','Factor a quadratic',[],
 'For x² + bx + c, look for two numbers whose sum is b and product is c. The factors are (x + p)(x + q). Expand to check.',
 'x² + 5x + 6 = (x + 2)(x + 3), because 2 + 3 = 5 and 2 × 3 = 6.', 'Which two integers multiply to the constant term and add to the coefficient of x?',
 [t('Factor x² + 7x + 12.', '(x+3)(x+4)',['(x+4)(x+3)']),t('Factor x² − 5x + 6.','(x-2)(x-3)',['(x-3)(x-2)']),t('Factor x² + 9x + 20.','(x+4)(x+5)',['(x+5)(x+4)'])]);
add('extension-count','extension','Count ordered outcomes',['extension-factor'],
 'For independent stages of a choice, multiply the number of options at each stage. When repetition is not allowed, reduce the options remaining after each choice.',
 'Three different letters chosen in order from five letters gives 5 × 4 × 3 = 60 possibilities.', 'How many options remain for each position after the previous choice?',
 [n('How many two-letter codes can be made from A, B, C, D with no repeated letters? Order matters.',12),n('How many three-digit codes use digits 1 to 5 without repetition?',60),n('A menu has 3 starters and 4 mains. How many starter–main combinations are possible?',12)]);
add('extension-logic','extension','Test a mathematical claim',[],
 'A single counterexample disproves a claim about all cases. Several successful examples do not prove a universal claim; a proof needs a general argument.',
 '“All prime numbers are odd” is false because 2 is prime and even.', 'Look for a case that satisfies the starting condition but breaks the conclusion.',
 [t('Give a prime number that disproves “all prime numbers are odd”.','2'),t('Give an integer x that disproves “x² > x for every integer”.','0',['1']),t('What is the mathematical name for one example that disproves a universal statement?','counterexample',['a counterexample'])]);
add('biology-cells','biology','Distinguish cell structures',[],
 'The cell membrane regulates movement into and out of a cell. The nucleus contains most of the DNA in a eukaryotic cell. Ribosomes build proteins; mitochondria are a major site of aerobic respiration.',
 'A muscle cell needs ATP for contraction and commonly contains many mitochondria. Both bacterial and animal cells have ribosomes.', 'Which structure performs the specific job described?',
 [t('Which cell structure is a major site of ATP production in aerobic respiration?','mitochondria',['mitochondrion']),t('Which structures synthesise proteins?','ribosomes',['ribosome']),t('Which structure controls movement of substances into and out of a cell?','cell membrane',['plasma membrane','the cell membrane'])]);
add('biology-diffusion','biology','Explain diffusion',['biology-cells'],
 'Diffusion is the net movement of particles from higher to lower concentration due to random motion. It does not require cellular energy input. Equilibrium means no net movement, not that particles stop moving.',
 'Oxygen can diffuse from a region of higher oxygen concentration into a cell where its concentration is lower.', 'Which way does the concentration gradient point?',
 [r('Explain the net movement of oxygen across a membrane when oxygen concentration is higher outside than inside.', 'Oxygen diffuses into the cell down its concentration gradient, from higher to lower concentration.',['direction into the cell','higher to lower concentration','diffusion']),t('What is the name of net particle movement from higher to lower concentration?','diffusion'),r('At diffusion equilibrium, do particles stop moving? Explain.','No. Particles keep moving randomly, but there is no net movement.',['particles continue moving','no net movement'])]);
add('biology-experiment','biology','Identify experimental variables',[],
 'The independent variable is deliberately changed. The dependent variable is measured. Controlled variables are kept consistent to make the comparison fair. Replicates help assess variability.',
 'When testing temperature and enzyme activity, change temperature, measure reaction rate and keep pH and enzyme concentration consistent.', 'Separate what the investigator changes from what they measure.',
 [t('A student varies light intensity and measures plant growth. Name the independent variable.','light intensity',['intensity of light']),t('A student varies water temperature and measures time for sugar to dissolve. Name the dependent variable.','time to dissolve',['time','dissolving time','time for sugar to dissolve']),t('What do we call variables deliberately kept consistent during an experiment?','controlled variables',['control variables','constants'])]);
add('physics-speed','physics','Calculate average speed',[],
 'Average speed is total distance divided by elapsed time. It is a scalar. Average velocity instead uses displacement and includes direction.',
 'A runner travels 150 m in 30 s: average speed = 150/30 = 5 m/s.', 'Divide total distance by total elapsed time, then include the unit.',
 [n('A cyclist travels 240 m in 30 s. Calculate average speed in m/s.',8,'m/s'),n('A runner travels 180 m in 45 s. Calculate average speed in m/s.',4,'m/s'),n('A car travels 600 m in 40 s. Calculate average speed in m/s.',15,'m/s')]);
add('physics-force','physics','Use Newton’s second law',['physics-speed'],
 'The net force on an object equals its mass multiplied by its acceleration: F_net = ma. Use kilograms for mass and m/s² for acceleration. The force is measured in newtons.',
 'A 4 kg object accelerating at 3 m/s² experiences a net force of 12 N.', 'Use the net force, rather than one force that may be balanced by another.',
 [n('A 6 kg object accelerates at 2 m/s². Calculate its net force in N.',12,'N'),n('A 3 kg object accelerates at 5 m/s². Calculate its net force in N.',15,'N'),n('An 8 kg object accelerates at 0.5 m/s². Calculate its net force in N.',4,'N')]);
add('physics-circuit','physics','Apply Ohm’s law',[],
 'For an ohmic component at constant temperature, voltage, current and resistance obey V = IR. Rearrange to I = V/R or R = V/I. Current is measured in amperes, resistance in ohms.',
 'A 12 V supply across a 6 Ω resistor produces I = 12/6 = 2 A.', 'Choose the rearrangement of V = IR that isolates the unknown.',
 [n('A 10 V supply is connected across a 5 Ω resistor. Find current in A.',2,'A'),n('A 12 V supply is connected across a 4 Ω resistor. Find current in A.',3,'A'),n('A 9 V supply is connected across a 6 Ω resistor. Find current in A.',1.5,'A')]);
add('english-device','english','Identify a language choice',[],
 'A metaphor directly presents one thing as another. A simile explicitly compares using “like” or “as”. Personification gives a non-human thing human qualities. Identifying a device is only the start: analysis explains its effect.',
 '“Her voice was velvet” is a metaphor: the comparison suggests softness and smoothness.', 'Look at how the comparison is made, or whether a human action is given to something non-human.',
 [t('Name the main language device in “The classroom was a furnace.”','metaphor',['a metaphor']),t('Name the main language device in “The leaves danced in the breeze.”','personification'),t('Name the main language device in “His hands were as cold as ice.”','simile',['a simile'])]);
add('english-evidence','english','Connect evidence to an interpretation',['english-device'],
 'An analytical response makes a specific claim, selects relevant textual evidence and explains how a language choice supports that interpretation. Naming a technique alone does not explain meaning.',
 'In “The classroom was a furnace”, the metaphor makes the heat feel intense and oppressive, suggesting an uncomfortable environment.', 'What particular impression does the image create, and which word creates it?',
 [r('Write 2–3 sentences analysing “The road swallowed the last of the sunlight.” Use a quotation and explain an effect.','The personification in “swallowed” presents the road as consuming light. It can suggest approaching darkness and an ominous journey. Other supported interpretations are valid.',['specific interpretation','relevant quotation','explained language effect']),r('Analyse the image “Hope was a small flame in the wind” in 2–3 sentences.','The metaphor presents hope as fragile but still alive. The surrounding “wind” suggests pressures threatening it.',['interpretation of hope','textual evidence','explained effect']),r('Explain how “The city never slept” shapes an impression of urban life.','Personification suggests constant activity and can imply energy or exhaustion, depending on context.',['supported interpretation','quoted detail','effect explained'])]);
add('english-edit','english','Edit sentence agreement',[],
 'A finite verb should agree with its subject in number. Find the subject rather than choosing the noun nearest the verb. Editing also checks clarity and sentence boundaries.',
 '“The collection of poems is moving”: the subject is the singular “collection”, so the verb is “is”.', 'Find the main subject. Is it singular or plural?',
 [t('Fill the gap with is or are: “The collection of poems ___ on the desk.”','is'),t('Fill the gap with has or have: “The students ___ finished their drafts.”','have'),t('Fill the gap with was or were: “Each of the writers ___ invited.”','was')]);
add('software-trace','software','Trace a variable through a program',[],
 'Trace code in execution order. Assignment replaces the current value. A loop repeats its body according to its condition or range; record changes in a trace table.',
 'x = 2; x = x + 3; x = x * 2 gives x = 10.', 'Write down the new value after every assignment.',
 [n('Trace this pseudocode. What is the final x?\nx = 4\nx = x + 3\nx = x * 2',14),n('What is the final total?\ntotal = 0\nFOR i FROM 1 TO 4 INCLUSIVE\n    total = total + i',10),n('What is the final x?\nx = 5\nx = x * 3\nx = x - 2',13)]);
add('software-condition','software','Reason about conditions',['software-trace'],
 'AND requires both conditions to be true. OR requires at least one to be true. NOT reverses a Boolean value. Check boundary values carefully when comparing numbers.',
 'For age = 16, age >= 15 AND age < 18 is true.', 'Evaluate each comparison separately before applying AND, OR or NOT.',
 [t('For x = 7, is x > 5 AND x < 10 true or false?','true'),t('For x = 3, is x > 5 OR x == 3 true or false?','true'),t('For x = 10, is x > 10 true or false?','false')]);
add('software-testing','software','Choose boundary test data',['software-condition'],
 'Boundary testing targets values on and immediately around a limit. For an accepted integer range, test just below, at, and just above each endpoint, alongside typical cases.',
 'For accepted ages 12–18 inclusive, useful tests include 11, 12, 13, 17, 18 and 19.', 'Which value sits immediately outside the permitted range?',
 [n('A program accepts integer scores from 0 to 100 inclusive. What integer is immediately above the upper valid boundary?',101),n('A program accepts integer ages from 12 to 18 inclusive. What integer is immediately below the lower valid boundary?',11),n('A program accepts integer quantities from 1 to 20 inclusive. What integer is immediately above the upper valid boundary?',21)]);

const year11Practice={
 'maths-point-938':{
  title:'Use zero and negative indices',prerequisites:['maths-powers'],
  lesson:'For a nonzero base, a zero exponent gives 1. A negative exponent takes the reciprocal of the corresponding positive power.',
  example:'2⁻³ = 1/2³ = 1/8.',hint:'Rewrite the negative power as a reciprocal before evaluating.',
  variants:[n('Evaluate 5⁰.',1),n('Evaluate 3⁻². A fraction is fine.',1/9),n('Evaluate 2⁻⁴. A fraction is fine.',1/16),n('Evaluate 4³ × 4⁻⁴.',1/4)],
 },
 'maths-point-955':{
  title:'Evaluate a function',prerequisites:['maths-linear','maths-powers'],
  lesson:'The notation f(a) asks for the value of the function at input a. Substitute a for every x and put negative inputs in brackets.',
  example:'If f(x) = x² − 2x, then f(−3) = (−3)² − 2(−3) = 15.',hint:'Replace each x with the given input before simplifying.',
  variants:[n('If f(x) = 3x + 1, find f(4).',13),n('If f(x) = x² − x, find f(−2).',6),n('If g(x) = 2x² − 5, find g(−3).',13),n('If h(x) = 7 − 2x, find h(0).',7)],
 },
 'extension-point-211':{
  title:'Evaluate an inverse function',prerequisites:['extension-logic'],
  lesson:'An inverse reverses the original function. To find f⁻¹(a), solve f(x) = a for x. The original function must be one-to-one on its domain.',
  example:'If f(x) = 3x − 2, then f⁻¹(10) = 4 because 3(4) − 2 = 10.',hint:'Treat the given number as the output of the original function.',
  variants:[n('For f(x) = 2x + 1, find f⁻¹(11).',5),n('For f(x) = 4x − 3, find f⁻¹(−7).',-1),n('For f(x) = x² with x ≥ 0, find f⁻¹(49).',7),n('For f(x) = 6 − 3x, find f⁻¹(0).',2)],
 },
 'extension-point-240':{
  title:'Find the degree of a polynomial sum',prerequisites:['extension-factor'],
  lesson:'Combine like powers first. The degree is the highest exponent with a nonzero coefficient after any terms cancel.',
  example:'(3x⁴ + x²) + (−3x⁴ + 2x) = x² + 2x, so the degree is 2.',hint:'Check whether the highest powers cancel.',
  variants:[n('Find the degree of (x³ + x) + (2x² − x).',3),n('Find the degree of (2x⁵ + x³) + (−2x⁵ + 4x²).',3),n('Find the degree of (x⁴ + 3x) + (−x⁴ − 3x + 7).',0),n('Find the degree of (2x² + 1) + (−x² + x).',2)],
 },
 'biology-point-314':{
  title:'Relate cell structures to their functions',prerequisites:['biology-cells'],
  lesson:'A plant cell wall provides support outside the cell membrane. Chloroplasts carry out photosynthesis in plant cells that contain them. A large central vacuole can help maintain turgor.',
  example:'A palisade cell has many chloroplasts, which absorb light for photosynthesis.',hint:'Identify the job described, then match it to a structure.',
  variants:[t('What rigid structure surrounds the membrane of a typical plant cell?','cell wall',['the cell wall']),t('Which organelles carry out photosynthesis in palisade cells?','chloroplasts',['chloroplast']),t('Which large plant cell compartment stores cell sap?','central vacuole',['vacuole','large central vacuole']),t('Which structure is found in both typical plant and animal cells: a cellulose wall or a cell membrane?','cell membrane',['a cell membrane','plasma membrane'])],
 },
 'biology-point-320':{
  title:'Distinguish passive transport processes',prerequisites:['biology-diffusion'],
  lesson:'Simple diffusion moves particles down a concentration gradient directly through the membrane. Facilitated diffusion uses a membrane protein without requiring cellular energy. Osmosis is net water movement across a selectively permeable membrane.',
  example:'An ion moving down its concentration gradient through an open channel is undergoing facilitated diffusion.',hint:'Ask whether the substance is water and whether it crosses through a protein.',
  variants:[t('Name the net movement of water across a selectively permeable membrane.','osmosis'),t('Oxygen moves directly through a cell membrane down its concentration gradient. Name the process.','simple diffusion',['diffusion']),t('Glucose moves down its concentration gradient through a carrier protein with no cellular energy input. Name the process.','facilitated diffusion'),t('Which crosses the membrane during osmosis: water or dissolved sugar?','water',['water molecules'])],
 },
 'physics-point-306':{
  title:'Calculate average velocity',prerequisites:['physics-speed'],
  lesson:'Average velocity is displacement divided by total elapsed time. In one dimension, use a positive or negative sign to represent direction.',
  example:'With east positive, travelling 12 m east then 4 m west in 4 s gives (12 − 4)/4 = 2 m/s.',hint:'Find the signed change in position from start to finish.',
  variants:[n('East is positive. A student walks 30 m east then 10 m west in 10 s. Give the signed average velocity in m/s.',2,'m/s'),n('East is positive. A cyclist moves 36 m west in 9 s. Give the signed average velocity in m/s.',-4,'m/s'),n('A runner completes a lap in 50 s and returns to the start. Give the average velocity in m/s.',0,'m/s'),n('Position changes from −4 m to +8 m in 6 s. Give the signed average velocity in m/s.',2,'m/s')],
 },
 'physics-point-313':{
  title:'Read acceleration from a velocity–time graph',prerequisites:['physics-speed'],
  lesson:'The gradient of a velocity–time graph is acceleration. For a straight segment, subtract initial velocity from final velocity and divide by the time interval.',
  example:'Velocity changes from 2 m/s to 14 m/s over 4 s. The gradient is (14 − 2)/4 = 3 m/s².',hint:'Divide the vertical change in velocity by the horizontal change in time.',
  variants:[n('On a straight segment, velocity rises from 0 to 20 m/s in 5 s. Give the acceleration in m/s^2.',4,'m/s^2'),n('Velocity drops uniformly from 18 to 6 m/s in 3 s. Give the signed acceleration in m/s^2.',-4,'m/s^2'),n('A velocity–time graph is horizontal at 8 m/s. Give the acceleration in m/s^2.',0,'m/s^2'),n('A straight line passes through (2 s, −3 m/s) and (5 s, 6 m/s). Give the acceleration in m/s^2.',3,'m/s^2')],
 },
 'english-point-253':{
  title:'Explain how imagery shapes an impression',prerequisites:['english-device'],
  lesson:'Quote the words that create the image. Explain the associations those words bring to the subject and connect them to a specific impression.',
  example:'Calling a corridor a “river of elbows” conveys crowded movement. “Elbows” draws attention to jostling bodies.',hint:'Choose a short quotation and explain what its associations suggest.',
  variants:[
   r('In “The windows stared into the empty street”, explain how the image shapes the atmosphere.','“Stared” personifies the windows, making the empty street feel watched and uneasy.',['short quotation','specific atmosphere','explanation of word choice']),
   r('In “Relief arrived like warm rain”, explain the effect of the comparison.','“Warm rain” suggests gentle, enveloping comfort, making relief feel physical and welcome.',['specific interpretation','quoted comparison','explained association']),
   r('In “His words were stones in her pockets”, explain what the image suggests about the words’ effect.','The “stones” suggest weight that she carries with her, making the words feel like a lasting burden.',['specific effect','quoted image','explained association']),
   r('In “The kettle hissed a warning”, explain the impression created by the description.','The warning gives an ordinary sound an ominous quality and suggests tension in the scene.',['textual evidence','specific impression','explained association']),
  ],
 },
 'english-point-251':{
  title:'Distinguish connotations',prerequisites:[],
  lesson:'Connotations are associations a word carries beyond its literal meaning. A writer can change a reader’s impression by swapping one word for a near-synonym.',
  example:'“Persistent” can suggest determination. “Stubborn” can suggest an unwillingness to listen.',hint:'Consider the judgement or feeling each word adds.',
  variants:[t('Which word gives a more approving impression: thrifty or stingy?','thrifty'),t('Which word makes a walk sound less hurried: strolled or rushed?','strolled'),t('Which word gives the room a more welcoming impression: cosy or cramped?','cosy',['cozy']),t('Which word implies stronger disapproval: careless or relaxed?','careless')],
 },
 'software-point-201':{
  title:'Trace selection and iteration together',prerequisites:['software-trace','software-condition'],
  lesson:'Trace one iteration at a time. Evaluate the condition using the current values, then record which branch runs and how it changes the state.',
  example:'Starting at total = 0, loop over 1, 2, 3 and add each i only if i > 1. The total becomes 0 → 0 → 2 → 5.',hint:'Write down the variable values after each pass through the loop.',
  variants:[
   n('What is the final total?\ntotal = 0\nFOR i FROM 1 TO 5 INCLUSIVE\n    IF i > 3\n        total = total + i',9),
   n('What is the final count?\ncount = 0\nFOR i FROM 0 TO 4 INCLUSIVE\n    IF i < 2\n        count = count + 1',2),
   n('What is the final x?\nx = 1\nREPEAT 3 TIMES\n    IF x < 3\n        x = x + 1\n    ELSE\n        x = x * 2',6),
   n('What is the final total?\ntotal = 10\nFOR i FROM 1 TO 4 INCLUSIVE\n    IF i >= 3\n        total = total - i',3),
  ],
 },
 'software-point-214':{
  title:'Convert binary and hexadecimal to decimal',prerequisites:[],
  lesson:'Binary place values are powers of two. Hexadecimal place values are powers of sixteen, and digits A–F represent ten through fifteen.',
  example:'Binary 1011 is 8 + 2 + 1 = 11. Hexadecimal 2A is 2 × 16 + 10 = 42.',hint:'Multiply each digit by its place value, starting with 1 on the right.',
  variants:[n('Convert binary 1101 to decimal.',13),n('Convert binary 10110 to decimal.',22),n('Convert hexadecimal 1F to decimal.',31),n('Convert hexadecimal 3C to decimal.',60)],
 },
};
export const skills=[...seeds];
for(const d of documents){
 for(const p of d.points||[]){
  skills.push({id:`${d.id}-point-${p.index}`,subject:d.id,title:p.text.length>130?p.text.slice(0,127)+'…':p.text,description:p.text,sourceCode:p.codes.join(', '),sourceUrl:d.contentUrl,year:p.year,foundation:false,provenance:'Official NESA content point; grouping and prerequisite mapping are authored',order:skills.length,prerequisites:seeds.filter(s=>s.subject===d.id).map(s=>s.id),variants:[]});
  const skill=skills.at(-1);
  if(skill.year===11&&year11Practice[skill.id])Object.assign(skill,year11Practice[skill.id]);
 }
 for(const o of d.outcomes){
  if(/LS|WM/.test(o.code))continue;
  const description=o.description.replace(/\s+/g,' ').trim();
  skills.push({id:`${d.id}-${o.code}`,subject:d.id,title:description.length>130?description.slice(0,127)+'…':description,description,sourceCode:o.code,sourceUrl:d.contentUrl,year:o.code.includes('-12')?12:11,foundation:false,provenance:'Official NESA outcome; learning task and prerequisite mapping are generated',order:skills.length,prerequisites:seeds.filter(s=>s.subject===d.id).map(s=>s.id),variants:[]});
 }
}
export const skillById=new Map(skills.map(s=>[s.id,s]));
export function questionFor(skill,index=0){
 const v=skill.variants[index%skill.variants.length];
 if(!v)return null;
 return {...v,id:`${skill.id}:prepared:${index%skill.variants.length}`,skillId:skill.id,hint:skill.hint,lesson:skill.lesson,example:skill.example,provenance:'Prepared practice · not an official NESA question',difficulty:index%3+1};
}
