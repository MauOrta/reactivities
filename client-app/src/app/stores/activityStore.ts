import {observable, action, computed, configure, runInAction} from 'mobx';
import { createContext, SyntheticEvent } from 'react';
import { IActivity } from '../models/activity';
import agent from '../api/agent';


configure({enforceActions: 'always'});

class ActivityStore {
    @observable activityRegistry = new Map();
    @observable activities: IActivity[] = [];
    @observable activity: IActivity | null = null;
    @observable loadingInitial = false;
    @observable editMode = false;
    @observable submitting = false;
    @observable target = '';

    @computed get activitiesByDate() {
        return this.groupActivitiesByDate(Array.from(this.activityRegistry.values()));
    }

    groupActivitiesByDate(activities: IActivity[]) {
        const sortedActivities = activities.sort (
            (a,b) => Date.parse(a.date) - Date.parse(b.date)
        )
        return Object.entries(sortedActivities.reduce((activities, activity) => {
            const date = activity.date.split('T')[0];
            activities[date] = activities[date] ? [...activities[date], activity] : [activity];
            return activities;
        }, {} as {[key: string]: IActivity[]}));
    }

    @action loadActivities = async () => {
        this.loadingInitial = true;
        try {
            const activities = await agent.Activities.list();
            runInAction('Loading Activities', () => {
                activities.forEach(activity => {
                    activity.date = activity.date.split('.')[0];
                    this.activityRegistry.set(activity.id, activity);
                });
                this.loadingInitial = false;
            })
            
        }
        catch (error) {
            runInAction('Loading activities error', () => {
                this.loadingInitial = false;
            })
            console.log(error)
           
        }
    };

    @action loadActivity = async (id: string) => {

        let activity = this.getActivity(id);
        if (activity) {
            this.activity = activity;
        } else {
            this.loadingInitial = true;
            try {
                activity = await agent.Activities.details(id);
                runInAction('getting activity',()=>{
                    this.activity = activity;
                    this.loadingInitial= false;
                })
            }
            catch (error) {
                runInAction('getting activity error',()=>{
                    this.loadingInitial= false;
                })
                console.log(error);
            }
            
        }

    };

    @action clearActivity =() => {
        this.activity = null;
    }
    getActivity = (id: string) => {
        return this.activityRegistry.get(id);
    }

    @action createActivity = async (activity: IActivity) => {
        this.submitting = true;
        try {
            await agent.Activities.create(activity);
            runInAction('create an activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.editMode = false;
                this.submitting = false;
            })
            
        }
        catch (error) {
            runInAction('create an activity error', () => {
                this.submitting = false;
            })
           
            console.log(error);
        }
    };
    
    @action editActivity = async (activity: IActivity) => {
        this.submitting = true;
        console.log(activity);
        try {
            await  agent.Activities.update(activity);
            runInAction('editing an activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.activity = activity;
                this.submitting = false;
            })
            

        }
        catch (error) {
            runInAction('editing an activity error', () => {
                this.submitting = false;
            })
            
            console.log(error);
        }
    };

    @action deleteActivity = async (event: SyntheticEvent<HTMLButtonElement>, id: string) => {
        this.submitting = true;
        this.target = event.currentTarget.name;
        try {
            await agent.Activities.delete(id);
            runInAction('deleting an activity', () => {
                this.activityRegistry.delete(id);
                this.submitting = false;
                this.target = '' ;
            })
           
        } 
        catch (error) {
            runInAction('deleting an activity error', () => {
                this.target = '';
                this.submitting = false
            })
            
            console.log(error);
        }
    }

    @action openEditForm = (id: string) => {

        this.activity = this.activityRegistry.get(id);
        this.editMode = true;
    };

    @action cancelSelectedActivity = () => {
        this.activity = null;
    };

    @action cancelFormOpen = () => {
       
        this.editMode = false;
    };

    @action openCreateForm =() => {
       
        this.editMode = true;
        this.activity = null;
    };

    @action selectActivity = (id: string) => {
        this.activity = this.activityRegistry.get(id);
        this.editMode = false;
       
    };
    
}

export default createContext(new ActivityStore())