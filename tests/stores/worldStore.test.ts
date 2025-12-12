import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from '../../stores/worldStore';
import { EntityCategory } from '../../types';

describe('worldStore', () => {
   beforeEach(() => {
      // Reset store before each test
      const store = useWorldStore.getState();
      store.resetModel('');
   });

   describe('Entity Management', () => {
      it('should add a new entity', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Test Person', 'A test person', 'person');
         
         expect(store.model.entities).toHaveLength(1);
         expect(store.model.entities[0].name).toBe('Test Person');
         expect(store.model.entities[0].description).toBe('A test person');
         expect(store.model.entities[0].category).toBe('person');
      });

      it('should update an existing entity', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Original Name', 'Original description', 'person');
         const entityId = store.model.entities[0].id;
         
         store.updateEntity(entityId, {
            name: 'Updated Name',
            description: 'Updated description'
         });
         
         expect(store.model.entities[0].name).toBe('Updated Name');
         expect(store.model.entities[0].description).toBe('Updated description');
      });

      it('should remove an entity', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Test Person', 'A test person', 'person');
         const entityId = store.model.entities[0].id;
         
         store.removeEntity(entityId);
         
         expect(store.model.entities).toHaveLength(0);
      });

      it('should not add entity with duplicate name', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Test Person', 'First person', 'person');
         store.addEntity('Test Person', 'Duplicate person', 'person');
         
         // Should only have one entity
         expect(store.model.entities).toHaveLength(1);
      });
   });

   describe('Relationship Management', () => {
      it('should add a relationship between entities', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Person A', 'First person', 'person');
         store.addEntity('Person B', 'Second person', 'person');
         
         const entityA = store.model.entities[0].name;
         const entityB = store.model.entities[1].name;
         
         store.addRelationship(entityA, entityB, 'friend');
         
         expect(store.model.relationships).toHaveLength(1);
         expect(store.model.relationships[0].from).toBe(entityA);
         expect(store.model.relationships[0].to).toBe(entityB);
         expect(store.model.relationships[0].type).toBe('friend');
      });

      it('should remove a relationship', () => {
         const store = useWorldStore.getState();
         
         store.addEntity('Person A', 'First person', 'person');
         store.addEntity('Person B', 'Second person', 'person');
         
         const entityA = store.model.entities[0].name;
         const entityB = store.model.entities[1].name;
         
         store.addRelationship(entityA, entityB, 'friend');
         const relId = store.model.relationships[0].id;
         
         store.removeRelationship(relId);
         
         expect(store.model.relationships).toHaveLength(0);
      });
   });

   describe('Story Segment Management', () => {
      it('should add a story segment', () => {
         const store = useWorldStore.getState();
         
         store.addStorySegment('Day 1', 'First day content');
         
         expect(store.storySegments).toHaveLength(1);
         expect(store.storySegments[0].timestamp).toBe('Day 1');
         expect(store.storySegments[0].content).toBe('First day content');
      });

      it('should update a story segment', () => {
         const store = useWorldStore.getState();
         
         store.addStorySegment('Day 1', 'Original content');
         const segmentId = store.storySegments[0].id;
         
         store.updateStorySegment(segmentId, {
            timestamp: 'Day 2',
            content: 'Updated content'
         });
         
         expect(store.storySegments[0].timestamp).toBe('Day 2');
         expect(store.storySegments[0].content).toBe('Updated content');
      });

      it('should remove a story segment', () => {
         const store = useWorldStore.getState();
         
         store.addStorySegment('Day 1', 'Content');
         const segmentId = store.storySegments[0].id;
         
         store.removeStorySegment(segmentId);
         
         expect(store.storySegments).toHaveLength(0);
      });
   });

   describe('Technology Management', () => {
      it('should add a technology node', () => {
         const store = useWorldStore.getState();
         
         store.addTechNode('Printing', 'Printing technology', 0, 0);
         
         expect(store.model.technologies).toHaveLength(1);
         expect(store.model.technologies[0].name).toBe('Printing');
      });

      it('should add a technology dependency', () => {
         const store = useWorldStore.getState();
         
         store.addTechNode('Paper', 'Paper making', 0, 0);
         store.addTechNode('Printing', 'Printing', 0, 0);
         
         const paperId = store.model.technologies[0].id;
         const printingId = store.model.technologies[1].id;
         
         store.addTechDependency(paperId, printingId);
         
         expect(store.model.techDependencies).toHaveLength(1);
         expect(store.model.techDependencies[0].from).toBe(paperId);
         expect(store.model.techDependencies[0].to).toBe(printingId);
      });
   });

   describe('State Management', () => {
      it('should set world context', () => {
         const store = useWorldStore.getState();
         
         store.setWorldContext('A fantasy world');
         
         expect(store.worldContext).toBe('A fantasy world');
      });

      it('should set chronicle text', () => {
         const store = useWorldStore.getState();
         
         store.setChronicleText('Chapter 1...');
         
         expect(store.chronicleText).toBe('Chapter 1...');
      });

      it('should set current time setting', () => {
         const store = useWorldStore.getState();
         
         store.setCurrentTimeSetting('Year 2050');
         
         expect(store.currentTimeSetting).toBe('Year 2050');
      });
   });

   describe('Model Reset', () => {
      it('should reset model with initial context', () => {
         const store = useWorldStore.getState();
         
         // Add some data
         store.addEntity('Test', 'Test', 'person');
         store.setWorldContext('Old context');
         
         // Reset
         store.resetModel('New initial context');
         
         expect(store.model.entities).toHaveLength(0);
         expect(store.worldContext).toBe('New initial context');
         expect(store.storySegments).toHaveLength(0);
      });
   });
});
