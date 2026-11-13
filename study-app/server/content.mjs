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

export const skills=[...seeds];
for(const d of documents){
 for(const p of d.points||[]){
  skills.push({id:`${d.id}-point-${p.index}`,subject:d.id,title:p.text.length>130?p.text.slice(0,127)+'…':p.text,description:p.text,sourceCode:p.codes.join(', '),sourceUrl:d.contentUrl,year:p.year,foundation:false,provenance:'Official NESA content point; grouping and prerequisite mapping are authored',order:skills.length,prerequisites:seeds.filter(s=>s.subject===d.id).map(s=>s.id),variants:[]});
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
