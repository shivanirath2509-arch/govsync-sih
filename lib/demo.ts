export const departments = ['identity', 'education', 'income', 'residence'] as const;
export type Department = typeof departments[number];
export const citizens = [
 {id:'DEMO-1001',name:'Asha Sharma',description:'Eligible applicant',initials:'AS'},
 {id:'DEMO-1002',name:'Rohan Patil',description:'Income above the limit',initials:'RP'},
 {id:'DEMO-1003',name:'Meera Joshi',description:'Conflicting birth dates',initials:'MJ'},
];
export const mappings: Record<Department,Record<string,string>> = {
 identity:{full_name:'name',birth_date:'dateOfBirth',citizen_ref:'citizenId'},
 education:{student_name:'name',dob:'dateOfBirth',percentage:'marks',institution:'college',program:'course'},
 income:{annual_income_inr:'annualIncome',financial_year:'financialYear'},
 residence:{state_name:'state',district_name:'district',domicile_verified:'domicileVerified'},
};
export function sampleRecord(department:Department,citizenId:string) {
 const citizen=citizens.find(c=>c.id===citizenId); if(!citizen)throw new Error('Unknown demo citizen');
 const records={
 identity:{citizen_ref:citizenId,full_name:citizen.name,birth_date:citizenId==='DEMO-1003'?'2006-02-18':'2006-04-12',verified:true},
 education:{student_name:citizen.name,dob:citizenId==='DEMO-1003'?'19/02/2006':'12/04/2006',percentage:citizenId==='DEMO-1002'?76:88.5,institution:'Demo Institute of Technology',program:'B.Tech · Computer Science',enrollment_status:'active'},
 income:{annual_income_inr:citizenId==='DEMO-1002'?420000:145000,financial_year:'2026-27',certificate_ref:'SAMPLE-INC-'+citizenId.slice(-4)},
 residence:{state_name:'Maharashtra',district_name:'Pune',domicile_verified:true},
 };return records[department];
}
export function normalize(department:Department,raw:Record<string,unknown>){
 const result:Record<string,unknown>={};
 for(const [source,target] of Object.entries(mappings[department])){let value=raw[source];if(target==='dateOfBirth'&&typeof value==='string'&&value.includes('/'))value=value.split('/').reverse().join('-');result[target]=value;}return result;
}
export function assess(records:Record<string,Record<string,any>>){
 const {identity,education,income,residence}=records;
 const rules=[
 {label:'Identity matches academic record',passed:identity.dateOfBirth===education.dateOfBirth&&identity.name===education.name,detail:'Name and date of birth must agree across sources.'},
 {label:'Academic score at least 75%',passed:education.marks>=75,detail:`${education.marks}% verified by Education`},
 {label:'Annual family income at most ₹2,50,000',passed:income.annualIncome<=250000,detail:`₹${Number(income.annualIncome).toLocaleString('en-IN')} verified by Income`},
 {label:'Verified Maharashtra domicile',passed:residence.state==='Maharashtra'&&residence.domicileVerified===true,detail:`${residence.state} · ${residence.district}`},
 ];const status=!rules[0].passed?'needs_review':rules.every(r=>r.passed)?'eligible':'ineligible';
 return {status,rules,profile:{...identity,...education,...income,...residence,name:identity.name,dateOfBirth:identity.dateOfBirth}};
}
