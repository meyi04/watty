import { blankStory, validateStory } from './story.service';
describe('Story validation', () => {
  it('rejects whitespace-only titles and authors', () => {
    expect(validateStory({ ...blankStory(), title: '   ', author: 'Writer' })).toBeTruthy();
    expect(validateStory({ ...blankStory(), title: 'Story', author: '   ' })).toBeTruthy();
  });
  it('accepts a valid story and rejects unsupported metadata', () => {
    const story = { ...blankStory(), title: 'A story', author: 'Writer' };
    expect(validateStory(story)).toBe('');
    expect(validateStory({ ...story, genre: 'Invalid' })).toBeTruthy();
    expect(validateStory({ ...story, status: 'Invalid' })).toBeTruthy();
    expect(validateStory({ ...story, coverColor: 'red' })).toBeTruthy();
  });
});
