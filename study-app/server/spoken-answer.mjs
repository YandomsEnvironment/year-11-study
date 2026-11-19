const ones={zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
export function spokenNumber(value){
 const plain=value.toLowerCase().replace(/[.,!?]$/,'').replace(/-/g,' ').trim();
 if(/^[-+]?\d+(?:\.\d+)?$/.test(value.trim()))return Number(value);
 const words=plain.split(/\s+/);let sign=1;
 if(['negative','minus'].includes(words[0])){sign=-1;words.shift();}
 if(!words.length)return null;
 const point=words.indexOf('point');const whole=point>=0?words.slice(0,point):words;
 let number=0;let group=0;let seen=false;
 let previous='';for(const word of whole){if(word==='and'){previous=word;continue;}if(word in ones){if(previous in ones)return null;group+=ones[word];seen=true;}else if(word in tens){if(previous in ones||previous in tens)return null;group+=tens[word];seen=true;}else if(word==='hundred'&&seen&&previous!=='hundred'){group*=100;}else if(word==='thousand'&&seen&&previous!=='thousand'){number+=group*1000;group=0;}else return null;previous=word;}
 if(!seen&&point!==0)return null;
 number+=group;
 if(point>=0){const decimal=words.slice(point+1);if(!decimal.length||decimal.some(w=>!(w in ones)||ones[w]>9))return null;number+=Number('0.'+decimal.map(w=>ones[w]).join(''));}
 return sign*number;
}
/** Only recognise a short numerical response or an explicit final answer, never arbitrary prose. */
export function spokenFinalValue(answer){
 if(String(answer).includes('?'))return null;
 let text=String(answer).trim().replace(/[.!]$/,'');
 const marker=/\b(?:(?:my\s+)?(?:final\s+)?answer\s+(?:is|equals)|(?:x|y|speed|velocity|acceleration|force|current|resistance|voltage|total|value)\s+(?:is|equals))\s+/gi;
 const matches=[...text.matchAll(marker)];if(matches.length)text=text.slice(matches.at(-1).index+matches.at(-1)[0].length);
 const unitRules=[[/\s+(?:metres?|meters?)\s+per\s+second\s+squared$/i,'m/s^2'],[/\s+(?:metres?|meters?)\s+per\s+second$/i,'m/s'],[/\s+kilomet(?:res?|ers?)\s+per\s+hour$/i,'km/h'],[/\s+(?:newtons?)$/i,'N'],[/\s+(?:amps?|amperes?)$/i,'A'],[/\s+(?:volts?)$/i,'V'],[/\s+(?:ohms?)$/i,'ohm'],[/\s+(?:kilograms?)$/i,'kg']];
 let unit='';for(const [pattern,name] of unitRules){if(pattern.test(text)){text=text.replace(pattern,'');unit=name;break;}}
 if(!unit){const m=text.match(/\s+(m\/s(?:\^2|²)?|km\/h|N|A|V|ohm|kg)$/i);if(m){unit=m[1];text=text.slice(0,m.index);}}
 const value=spokenNumber(text.trim());return value===null?null:`${value}${unit?' '+unit:''}`;
}
